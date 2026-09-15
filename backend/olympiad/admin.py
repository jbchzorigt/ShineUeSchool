"""
Django admin: багш нар энд хуваарь, үр дүн, албумын зургаа оруулна.
Энэ нь "админ дашбоард"-ын анхны хувилбар болно.
"""

from django.contrib import admin

from .models import AlbumPhoto, Result, Stage


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ("year", "order", "title", "date_text", "location")
    list_filter = ("year",)
    list_editable = ("order",)
    search_fields = ("title", "text")
    ordering = ("-year", "order")


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ("year", "category", "last_name", "first_name", "school", "score", "rank_label", "medal")
    list_filter = ("year", "category", "medal")
    search_fields = ("last_name", "first_name", "school", "code")
    ordering = ("-year", "category", "-score")
    list_per_page = 50


@admin.register(AlbumPhoto)
class AlbumPhotoAdmin(admin.ModelAdmin):
    list_display = ("order", "caption", "is_published")
    list_editable = ("is_published",)
    ordering = ("order",)
