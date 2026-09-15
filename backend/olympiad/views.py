"""
Олимпиадын API. Унших нь нээлттэй, бичих нь staff хэрэглэгчид (JWT).

  GET    /api/olympiad/years/                      → {"schedule": [...], "results": [...]}
  GET    /api/olympiad/stats/                      → админ дашбоардын тоон үзүүлэлт
  GET    /api/olympiad/schedule/?year=2026         → тухайн оны шатууд (order-оор)
  POST   /api/olympiad/schedule/                   → шат нэмэх (staff)
  PATCH  /api/olympiad/schedule/<id>/              → шат засах (staff)
  DELETE /api/olympiad/schedule/<id>/              → шат устгах (staff)
  GET    /api/olympiad/results/?year=2025&grade=9  → үр дүн (оноогоор, байртай)
  POST/PATCH/DELETE /api/olympiad/results/...      → үр дүн удирдах (staff)
  GET    /api/olympiad/album/                      → нийтлэгдсэн албумын зургууд
  POST/PATCH/DELETE /api/olympiad/album/...        → албум удирдах (staff, multipart)
"""

from django.db.models import Count, F, Window
from django.db.models.functions import Rank
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import AlbumPhoto, Result, Stage
from .permissions import IsStaffOrReadOnly
from .serializers import AlbumPhotoSerializer, ResultSerializer, StageSerializer


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
    filterset_fields = ["year", "grade"]

    def get_queryset(self):
        # Байр: гараар оруулсан бол түүнийг, үгүй бол он+ангийн дотор оноогоор тооцсон байрыг өгнө.
        computed = Window(expression=Rank(), partition_by=[F("year"), F("grade")], order_by=F("score").desc())
        return Result.objects.annotate(computed_rank=computed).order_by("year", "grade", "computed_rank", "student")

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        for r in qs:
            r.rank = r.rank or r.computed_rank
        return Response(self.get_serializer(qs, many=True).data)


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
