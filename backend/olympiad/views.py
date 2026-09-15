"""
Read-only API.

  GET /api/olympiad/years/                    → {"schedule": [2024, 2025, 2026], "results": [2024, 2025]}
  GET /api/olympiad/schedule/?year=2026       → тухайн оны шатууд (order-оор)
  GET /api/olympiad/results/?year=2025&grade=9 → тухайн он, ангийн үр дүн (оноогоор, байртай)
  GET /api/olympiad/album/                    → нийтлэгдсэн албумын зургууд
"""

from django.db.models import F, Window
from django.db.models.functions import Rank
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import AlbumPhoto, Result, Stage
from .serializers import AlbumPhotoSerializer, ResultSerializer, StageSerializer


class StageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stage.objects.all()
    serializer_class = StageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["year"]


class ResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ResultSerializer
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


class AlbumPhotoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AlbumPhoto.objects.filter(is_published=True)
    serializer_class = AlbumPhotoSerializer


@api_view(["GET"])
def years(request):
    """Frontend-ийн оны табуудыг үүсгэхэд ашиглана."""
    # Meta.ordering нь distinct-д нөлөөлдөг тул order_by()-оор цэвэрлэнэ.
    return Response({
        "schedule": sorted(set(Stage.objects.order_by().values_list("year", flat=True))),
        "results": sorted(set(Result.objects.order_by().values_list("year", flat=True))),
    })
