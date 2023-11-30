import logging
import os
import subprocess

from django.conf import settings

logger = logging.getLogger(__name__)


def compress_audio(input_file: str, instance=None) -> str:
    """Compress audio files by FFmpeg, make sure that installed on server"""

    result = input_file

    if check_ffmpeg_is_installed():

        name, ext = os.path.splitext(input_file)
        result = f"{name}_comp{ext}"

        command = f'ffmpeg -i {input_file} -b:a 128k -f mp3 -y {result}'
        subprocess.call(command, shell=True)

        logger.debug("File %s successfully compressed" % input_file)
    else:
        logger.info("FFmpeg is not installed")

    if instance is not None:
        dst_path = get_upload_voice_path(instance, result)
        os.rename(result, dst_path)

    return result


def check_ffmpeg_is_installed() -> bool:
    import shutil
    return shutil.which('ffmpeg') is not None


def get_mp3_duration(file_path):
    duration = "00:00"
    if check_ffmpeg_is_installed():
        command = f'ffmpeg -i {file_path} 2>&1 | grep Duration'
        output = subprocess.check_output(command, shell=True).decode('utf-8')
        duration = output.split(',')[0].split(':')[1].strip()
    else:
        logger.info("FFmpeg is not installed")
    return duration


def get_upload_path(instance, filename: str) -> str:

    if os.path.isfile(os.path.join(settings.MEDIA_ROOT, filename)):
        return filename

    if filename in [settings.DEFAULT_USER_IMAGE_PATH, settings.DEFAULT_ROOM_IMAGE_PATH]:
        return filename

    logger.debug(f"Upload new image: {filename} for {instance}")
    return os.path.join(instance.__class__.__name__.lower(), str(instance.pk), "images",  filename)


def get_upload_voice_path(instance, filename: str) -> str:
    filename = filename.split('\\')[-1]
    filename, ext = os.path.splitext(filename)
    return os.path.join(
        instance.room.__class__.__name__.lower(),
        str(instance.room.pk),
        "voice_msgs",
        f"{filename}_{instance.pk}{ext}"
    )
