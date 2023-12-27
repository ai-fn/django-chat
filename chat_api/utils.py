import logging
import os
import subprocess

from django.conf import settings
from django.core.files import File

logger = logging.getLogger(__name__)


def compress_audio(input_file: str, instance) -> None:
    """Compress audio files by FFmpeg, make sure that installed on server"""

    if instance.__class__.__name__ != "Message":
        raise TypeError('%s class is not expected' % instance.__class__.__name__)

    result = input_file

    if check_ffmpeg_is_installed():

        name, ext = os.path.splitext(input_file)
        result = f"{name}_comp{ext}"

        command = f'ffmpeg -i {input_file} -b:a 128k -f mp3 -y {result}'
        subprocess.call(command, shell=True)
        logger.debug("File %s successfully compressed" % input_file)
    else:
        logger.info("FFmpeg is not installed")
    with open(result, "rb") as comp_file:
        new_file = File(comp_file)
        new_filename = os.path.basename(new_file.name)
        instance.voice_file.save(new_filename, new_file, save=True)
    os.remove(input_file)
    if input_file != result:
        os.remove(result)


def compress(input_file: str, instance) -> None:

    result = input_file
    if check_ffmpeg_is_installed():

        name, ext = os.path.splitext(input_file)
        result = f"{name}_comp.jpg"
        ffmpeg_command = [
                "ffmpeg",
                "-i", input_file,
                "-q:v", "20",
                result
        ]
        subprocess.run(ffmpeg_command, shell=True)
        logger.debug("File %s successfully compressed" % input_file)
    else:
        logger.info("FFmpeg is not installed")
    with (open(result, "rb") as comp_file):
        new_file = File(comp_file)
        new_filename = os.path.basename(new_file.name)
        instance.image.save(new_filename, new_file, save=True)
    os.remove(input_file)
    if input_file != result:
        os.remove(result)


def check_ffmpeg_is_installed() -> bool:
    import shutil
    return shutil.which('ffmpeg') is not None


def get_upload_path(instance, filename: str) -> str:

    if filename in [settings.DEFAULT_USER_IMAGE_PATH, settings.DEFAULT_ROOM_IMAGE_PATH]:
        return filename

    filename = filename.split('\\')[-1]
    filename, ext = os.path.splitext(filename)
    instance_name = instance.__class__.__name__.lower()
    logger.debug(f"Upload new file: {filename + ext} for {instance}")

    if instance_name == "message":
        return os.path.join('room', str(instance.room.pk), instance.msg_type, f"{filename}_{instance.pk}{ext}")
    elif hasattr(instance, "message"):
        return os.path.join('room', str(instance.message.room.pk), instance.message.msg_type, f"{filename}_{instance.pk}{ext}")
    else:
        return os.path.join(instance_name, str(instance.pk), f"{instance_name}-pic", f"{filename}_{instance.pk}{ext}")
