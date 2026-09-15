"""
Олимпиадын API. Унших нь нээлттэй, бичих нь staff хэрэглэгчид (JWT).

  GET    /api/olympiad/years/                          → {"schedule": [...], "results": [...]}
  GET    /api/olympiad/stats/                          → админ дашбоардын тоон үзүүлэлт
  GET    /api/olympiad/categories/                     → ангиллын жагсаалт (value, label)
  GET    /api/olympiad/schedule/?year=2026             → тухайн оны шатууд (order-оор)
  POST/PATCH/DELETE /api/olympiad/schedule/...         → шат удирдах (staff)
  GET    /api/olympiad/results/?year=2025&category=9   → үр дүн (оноогоор, байртай)
  POST/PATCH/DELETE /api/olympiad/results/...          → үр дүн удирдах (staff)
  POST   /api/olympiad/results/import/                 → Excel импорт (staff, multipart)
  GET    /api/olympiad/album/                          → нийтлэгдсэн албумын зургууд
  POST/PATCH/DELETE /api/olympiad/album/...            → албум удирдах (staff, multipart)
"""

from django.db.models import Count, F, Window
from django.db.models.functions import Rank
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .importer import import_workbook, parse_workbook
from .models import AlbumPhoto, Result, Stage
from .permissions import IsStaffOrReadOnly
from .serializers import (
    CATEGORIES, AlbumPhotoSerializer, ImportRequestSerializer, ResultSerializer, StageSerializer,
)


class StageViewSet(viewsets.ModelViewSet):
    queryset = Stage.objects.all()
    serializer_class = StageSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["year"]


class ResultViewSet(viewsets.ModelViewSet):
    serializer_class = ResultSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["year", "category"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        # Байр: гараар оруулсан бол түүнийг, үгүй бол он+ангиллын дотор оноогоор тооцсон байрыг өгнө.
        computed = Window(
            expression=Rank(),
            partition_by=[F("year"), F("category")],
            order_by=F("score").desc(nulls_last=True),
        )
        return Result.objects.annotate(computed_rank=computed).order_by(
            "year", "category", "computed_rank", "last_name", "first_name"
        )

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        for r in qs:
            r.rank = r.rank or r.computed_rank
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="import")
    def import_excel(self, request):
        """
        Excel файлаас үр дүн импортлох.
        multipart: file, year (сонголттой), dry_run (true бол зөвхөн шалгана), replace (анхдагч true)
        """
        ser = ImportRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        f = ser.validated_data["file"]
        if not f.name.lower().endswith((".xlsx", ".xlsm", ".xls")):
            return Response({"file": ["Зөвхөн Excel (.xlsx) файл хүлээн авна."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parsed = parse_workbook(f.read(), ser.validated_data.get("year"))
        except Exception as e:  # noqa: BLE001
            return Response({"file": [f"Файлыг уншиж чадсангүй: {e}"]}, status=status.HTTP_400_BAD_REQUEST)

        year = ser.validated_data.get("year") or (parsed.detected_date.year if parsed.detected_date else None)
        if not year:
            return Response({"year": ["Оныг тодорхойлж чадсангүй. Оноо оруулна уу."]}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "year": year,
            "detected_date": parsed.detected_date,
            "total": parsed.total,
            "sheets": [s.summary() for s in parsed.sheets],
            "dry_run": ser.validated_data["dry_run"],
        }
        if not ser.validated_data["dry_run"]:
            payload.update(import_workbook(parsed, year, replace=ser.validated_data["replace"]))
        return Response(payload)


class AlbumPhotoViewSet(viewsets.ModelViewSet):
    serializer_class = AlbumPhotoSerializer
    permission_classes = [IsStaffOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        # Staff бүх зургийг (нийтлээгүйг ч) харна, бусад нь зөвхөн нийтлэгдсэнийг.
        qs = AlbumPhoto.objects.all()
        u = self.request.user
        if not (u.is_authenticated and u.is_staff):
            qs = qs.filter(is_published=True)
        return qs


@api_view(["GET"])
def years(request):
    """Frontend-ийн оны табуудыг үүсгэхэд ашиглана."""
    # Meta.ordering нь distinct-д нөлөөлдөг тул order_by()-оор цэвэрлэнэ.
    return Response({
        "schedule": sorted(set(Stage.objects.order_by().values_list("year", flat=True))),
        "results": sorted(set(Result.objects.order_by().values_list("year", flat=True))),
    })


@api_view(["GET"])
def categories(request):
    """Ангиллын жагсаалт. year өгвөл тухайн онд үр дүнтэй ангиллуудыг л буцаана."""
    year = request.query_params.get("year")
    items = CATEGORIES
    if year:
        present = set(Result.objects.filter(year=year).order_by().values_list("category", flat=True))
        items = [c for c in CATEGORIES if c["value"] in present]
    return Response(items)


@api_view(["GET"])
def stats(request):
    """Админ дашбоардын нүүр хуудасны тоон үзүүлэлт."""
    by_year = (
        Result.objects.order_by().values("year")
        .annotate(count=Count("id"))
        .order_by("year")
    )
    return Response({
        "stages": Stage.objects.count(),
        "results": Result.objects.count(),
        "photos": AlbumPhoto.objects.count(),
        "results_by_year": list(by_year),
        "latest_year": max(
            [*Stage.objects.order_by().values_list("year", flat=True)] or [None]
        ),
    })
