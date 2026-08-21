FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY Source/ ./Source/

WORKDIR /app/Source

EXPOSE 3000

CMD ["python", "main.py"]
