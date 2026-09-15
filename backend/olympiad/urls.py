from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("schedule", views.StageViewSet, basename="stage")
router.register("results", views.ResultViewSet, basename="result")
router.register("album", views.AlbumPhotoViewSet, basename="album")

urlpatterns = [
    path("years/", views.years, name="olympiad-years"),
    path("stats/", views.stats, name="olympiad-stats"),
    path("categories/", views.categories, name="olympiad-categories"),
    path("", include(router.urls)),
]
