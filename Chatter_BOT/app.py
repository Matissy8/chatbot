from flask import Flask, render_template, request, jsonify
from chatterbot import ChatBot
from chatterbot.trainers import ListTrainer
import random
import sys

sys.stdout.reconfigure(encoding='utf-8')

app = Flask(__name__)

app.config['JSON_AS_ASCII'] = False
app = Flask(__name__)

bot = ChatBot("MatisaBots")

trainer = ListTrainer(bot)

trainer.train([

    # Sasveicināšanās
    "Sveiki",
    "Labdien.",

    "Čau",
    "Sveiki.",

    "Labrīt",
    "Labrīt.",

    "Labvakar",
    "Labvakar.",

    # Saruna
    "Kā tev iet?",
    "Man iet labi.",

    "Ko tu dari?",
    "Atbildu uz jautājumiem.",

    "Kas tu esi?",
    "Es esmu čatbots, izveidots ar Python.",

    "Kas tevi izveidoja?",
    "Mani izveidoja Matīss.",

    # Programmēšana
    "Kas ir Python?",
    "Python ir programmēšanas valoda.",

    "Kas ir HTML?",
    "HTML tiek izmantots mājaslapu veidošanai.",

    "Kas ir Flask?",
    "Flask ir Python bibliotēka mājaslapu serveriem.",

    # Motivācija
    "Man nav motivācijas",
    "Mēģini sākt ar mazu uzdevumu.",

    "Es esmu noguris",
    "Dažreiz palīdz īsa atpūta.",

    # Spēles
    "Kāda ir laba spēle?",
    "Minecraft un Undertale ir populāras spēles.",

    # Joki
    "Pastāsti joku",
    "Programmētāji bieži meklē kļūdas ilgāk nekā tās labo.",

    # Atvadīšanās
    "Atā",
    "Uz redzēšanos.",

    "Uz redzēšanos",
    "Visu labu."

])

fallback_answers = [
    "Es īsti nesapratu jautājumu.",
    "Varat paskaidrot precīzāk?",
    "Interesants jautājums.",
    "Es vēl mācos atbildēt uz šo jautājumu.",
    "Mēģiniet uzrakstīt citādi."
]

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/get-response", methods=["POST"])
def get_response():

    user_text = request.json["message"]

    response = bot.get_response(user_text)

    return jsonify({
        "reply": str(response)
    })

if __name__ == "__main__":
    app.run(debug=True)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 