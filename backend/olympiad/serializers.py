"""
DRF serializer-ууд. JSON бүтэц нь прототипийн JS объектуудтай (SCHEDULES, RESULTS)
аль болох ижил байхаар хийсэн тул frontend-ийн код бага өөрчлөгдөнө.
"""

from rest_framework import serializers

from .models import AlbumPhoto, Result, Stage


class StageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = ["id", "year", "order", "title", "date_text", "date", "text", "tags", "location"]


class ResultSerializer(serializers.ModelSerializer):
    # Байрыг view талд оноогоор тооцоод annotate хийж өгнө.
    rank = serializers.IntegerField(read_only=True)
    score = serializers.FloatField()

    class Meta:
        model = Result
        fields = ["id", "year", "grade", "rank", "student", "school", "score", "note"]


class AlbumPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = AlbumPhoto
        fields = ["id", "order", "image", "caption"]

    def get_image(self, obj):
        request = self.context.get("request")
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url
