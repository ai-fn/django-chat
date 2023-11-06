# django-chat
Sample WebSocker chat app

## Main Features:
- Creating, deleting chat folders。
- Creating, deleting chat rooms, adding members。
- Notifications for unread messages and unviewed friend requests。
- Support full-text search on users, adding friends。
- Changing profile。

## Installation:
Clone repos
```bash 
git clone https://github.com/ai-fn/django-chat.git
```

Go to workdir `cd django-chat`

Install via pip: `pip install -r req.txt`

### Configuration
Most configurations are in `setting.py`, others are in backend configurations.

I set many `setting` configuration with my environment variables (such as: `SECRET_KEY`, `DEBUG` and some email configuration parts.) and they did NOT been submitted to the `GitHub`. You can change these in the code with your own configuration or just add them into your environment variables.

### Docker-compose up
Build and run containers as daemon 
`docker-compose up --build -d`

## Run

Modify `chat/setting.py` with database settings, as following:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'chat',
        'USER': 'root',
        'PASSWORD': 'password',
        'HOST': 'host',
        'PORT': 5432,
    }
}
```

### Create database
Run the following command in PostgreSQL shell:
```sql
craetedb `chat`;
```

Run the following commands in Terminal:
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createcachetable
```  

### Create super user

Run command in terminal:
```bash
python manage.py createsuperuser
```

### Run tests
```bash
python manage.py test
```

### Collect static files
Run command in terminal:
```bash
python manage.py collectstatic --noinput
```

### Getting start to run server
Execute:
  - ASGI `daphne chat.asgi:application --bind 0.0.0.0 --port 8000`
  - WSGI `python manage.py runserver`

Open up a browser and visit: http://127.0.0.1:8000/ , the you will see the chat.
