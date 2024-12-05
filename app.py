import os
from flask import Flask, request, render_template
from utils.scraper import fetch_images_and_title

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def index():
    thread_url = None
    thread_title = None
    images = []
    if request.method == "POST":
        thread_url = request.form.get("url")
        if thread_url:
            thread_title, images = fetch_images_and_title(thread_url)
    return render_template("index.html", thread_url=thread_url, thread_title=thread_title, images=images)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
