"""
URL тохиргоо.

  /admin/            → Django admin (хуваарь, үр дүн, албум оруулах)
  /api/olympiad/...  → олимпиадын read-only API (olympiad/urls.py)
  /media/...         → хөгжүүлэлтийн үед оруулсан зургуудыг өгнө
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Шинэ Үе сургууль — удирдлага"
admin.site.site_title = "Шинэ Үе admin"
admin.site.index_title = "Удирдлагын самбар"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/olympiad/", include("olympiad.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
