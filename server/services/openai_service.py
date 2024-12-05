from openai import OpenAI
from config import Config

config = Config()
client = OpenAI(api_key=config.OPENAI_API_KEY)