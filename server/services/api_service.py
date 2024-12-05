import requests
import json
from datetime import datetime, timedelta
import logging
from services.openai_service import client, config

logger = logging.getLogger(__name__)

AUTHORIZATION_HEADER = {
    "Content-Type": "application/json",
    "Authorization": f'Bearer {config.AUTHORIZATION_KEY}'
}

def get_filtered_vehicles(company_id):
    url = "https://test-api.meinfahrer.app/api/v1/admin/vehicle/getAll"
    payload = {
        "sorting": {"model": 1}
    }

    try:
        response = requests.post(url, headers=AUTHORIZATION_HEADER, json=payload)
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get("data", {}).get("vehicles", [])
            vehicles = [
                {
                    "model": c.get("model"),
                    "plate": c.get("plate"),
                    "id": c.get("_id"),
                    "companyId": c.get("company")
                } for c in vehicles
            ]
            return vehicles
        else:
            logger.error(f"Error fetching vehicles: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        logger.error(f"Exception in get_filtered_vehicles: {str(e)}")
        return None

def get_shift(date, vehicle):
    vehicle = json.loads(vehicle)
    date_obj = datetime.strptime(date, "%Y-%m-%dT%H:%M:%S")
    start_window = date_obj - timedelta(days=1)
    end_window = date_obj + timedelta(days=1)
    driver_info_list = []

    url = "https://test-api.meinfahrer.app/api/v1/admin/shift/getAll"
    payload = {
        "vehicle": vehicle['id'],
        "startDate": start_window.strftime("%Y-%m-%d"),
        "endDate": end_window.strftime("%Y-%m-%d"),
        "page_size": 50,
    }

    try:
        response = requests.post(url, headers=AUTHORIZATION_HEADER, json=payload)
        if response.status_code == 200:
            shifts = response.json().get('data', {}).get('shifts', [])
            for shift in shifts:
                shift_start_str = shift.get('startDate')
                shift_end_str = shift.get('endDate')
                if shift_start_str and shift_end_str:
                    shift_start = datetime.strptime(shift_start_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                    shift_end = datetime.strptime(shift_end_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                    if shift_start <= date_obj <= shift_end:
                        driver = shift.get('driver', {})
                        driver_info = {
                            'first_name': driver.get('firstName', ''),
                            'last_name': driver.get('lastName', ''),
                            'date_of_birth': driver.get('dateOfBirth', ''),
                            'full_address': driver.get('streetAndHouseNumber', {}),
                            'postal_code_city': driver.get('postalCodeCityDistrict', ''),
                            'shift_start': shift_start_str,
                            'shift_end': shift_end_str,
                            'postal_code': driver.get('placeOfBirth', ''),
                        }
                        driver_info_list.append(driver_info)
            return driver_info_list
        else:
            logger.error(f"Error fetching shifts: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        logger.error(f"Exception in get_shift: {str(e)}")
        return None

def determine_company(user_input, company_list):
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an intelligent assistant that helps identify companies based on user input. "
                    "You are provided with a list of companies and their IDs. Match the user input to the "
                    "most likely company and return the name and ID in JSON format. Please dont give any company when the user wasn't given any company information"
                    
                )
            },
            {
                "role": "assistant",
                "content": f"The following is the list of companies: {company_list}"
            },
            {
                "role": "user",
                "content": f"I want to find the company, if there is any Information about: {user_input}"
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "identified_company",
                "schema": {
                    "type": "object",
                    "strict": True,
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "The name of the identified company."
                        },
                        "id": {
                            "type": "string",
                            "description": "The unique ID of the identified company."
                        }
                    },
                    "required": ["name", "id"],
                    "additionalProperties": False
                }
            }
        },
        temperature=0.7,
        max_tokens=200,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0
    )
    # Extrahiere die Antwort#
    print(completion.choices[0].message.content)
    return completion.choices[0].message.content


def determine_vehicle(user_input, vehicles):
    # OpenAI-Aufruf
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an intelligent assistant that helps identify vehicles based on user input. "
                    "You are provided with a list of vehicles and their IDs. Match the user input (license plate) "
                    "to the most likely vehicle and return the name and ID in JSON format."
                )
            },
            {
                "role": "assistant",
                "content": f"The following is the list of vehicles: {vehicles}"
            },
            {
                "role": "user",
                "content": f"I want to find the vehicle with license plate: {user_input}"
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "identified_vehicle",
                "schema": {
                    "type": "object",
                    "strict": True,
                    "properties": {
                        "model": {
                            "type": "string",
                            "description": "The model of the identified vehicle."
                        },
                        "plate": {
                            "type": "string",
                            "description": "The plate of the identified vehicle."
                        },
                        "id": {
                            "type": "string",
                            "description": "The unique ID of the identified vehicle."
                        }
                    },
                    "required": ["model","plate","id"],
                    "additionalProperties": False
                }
            }
        },
        temperature=0.7,
        max_tokens=200,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0
    )
    return completion.choices[0].message.content  # Gibt die JSON-Antwort zurück

def get_filtered_companies():
    url = "https://test-api.meinfahrer.app/api/v1/admin/company/getAll"
    payload = {
        "sorting": {"fullName": 1}
    }

    try:
        response = requests.post(url, headers=AUTHORIZATION_HEADER, json=payload)
        if response.status_code == 200:
            data = response.json()
            companies = data.get("data", {}).get("companies", [])
            filtered_companies = [
                {"name": c.get("fullName"), "id": c.get("_id")} for c in companies
            ]
            return filtered_companies
        else:
            logger.error(f"Error in get_filtered_companies: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Exception in get_filtered_companies: {str(e)}")
        return None

def extract_ticket_info(user_input_license_plate, user_input_datetime, user_input_company):
    all_companies = get_filtered_companies()
    company = determine_company(user_input_company, all_companies)
    company = json.loads(company)
    if not company.get('id'):
            return "Kein Unternehmen gefunden zu dem Namen: " + user_input_company 
    all_filtered_vehicles = get_filtered_vehicles(company['id'])
    vehicle_plate = determine_vehicle(user_input_license_plate, all_filtered_vehicles)
    driver_list = get_shift(user_input_datetime, vehicle_plate)

    if not driver_list:
        return "Keine Schichten gefunden für die Zeit"

    return (
        f"Die Rückgabewerte sind: Firmenname: {company['name']}, "
        f"Fahrzeug: {vehicle_plate}, Fahrer: {driver_list[0]}"
    )