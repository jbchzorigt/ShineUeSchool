"""
DRF serializer-ууд. JSON бүтэц нь frontend/src/lib/types.ts-тэй тохирно.
"""

from rest_framework import serializers

from .models import AlbumPhoto, Category, Result, Stage


class StageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = ["id", "year", "order", "title", "date_text", "date", "text", "tags", "location"]


class ResultSerializer(serializers.ModelSerializer):
    # Байрыг view талд оноогоор тооцоод annotate хийж өгнө.
    rank = serializers.IntegerField(read_only=True)
    score = serializers.FloatField(allow_null=True, required=False)
    student = serializers.CharField(read_only=True)          # Б.Мухулай
    full_name = serializers.CharField(read_only=True)        # Бат Мухулай
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Result
        fields = [
            "id", "year", "category", "category_label", "rank", "rank_label", "medal",
            "last_name", "first_name", "student", "full_name", "school", "code",
            "scores", "score", "note",
        ]


class AlbumPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = AlbumPhoto
        fields = ["id", "order", "image", "caption"]

    def get_image(self, obj):
        request = self.context.get("request")
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class ImportRequestSerializer(serializers.Serializer):
    """POST /api/olympiad/results/import/ — multipart."""

    file = serializers.FileField()
    year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)
    dry_run = serializers.BooleanField(required=False, default=False)
    replace = serializers.BooleanField(required=False, default=True)


CATEGORIES = [{"value": c.value, "label": c.label} for c in Category]
