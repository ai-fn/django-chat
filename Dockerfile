FROM python:3.11-slim as base

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

# Keeps Python from buffering stdout and stderr to avoid situations where
# the application crashes without emitting any logs due to buffering.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get clean

COPY req.txt /app/

RUN pip install -r req.txt

# Copy the source code into the container.
COPY . /app/

# Run the application.
CMD python manage.py makemigrations \
    && python manage.py migrate \
    && python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='root').exists() or User.objects.create_superuser(username='root', email='root@example.com', password='root', is_email_confirmed=True)" \
    && python manage.py collectstatic --no-input \
    && python manage.py createcachetable \
    && daphne chat.asgi:application --bind 0.0.0.0 --port 8000
