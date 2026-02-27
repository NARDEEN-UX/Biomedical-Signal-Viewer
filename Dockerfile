# Use Python 3.9
FROM python:3.9

# Set working directory
WORKDIR /code

# Copy the requirements file from the backend folder
COPY ./backend/requirements_back.txt /code/requirements.txt

# Install the dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the backend code
COPY ./backend /code/app

# Start the application on port 7860 (Hugging Face default)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
