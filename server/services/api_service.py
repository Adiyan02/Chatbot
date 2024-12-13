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
    url = "https://dev-api.meinfahrer.app/api/v1/admin/vehicle/getAll"
    payload = {
        "companies": [company_id],
        "page_size": 200,
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

def get_driver_by_company_vehicle(vehicle_id, company_id):
    url = "https://dev-api.meinfahrer.app/api/v1/admin/user/getAll"
    payload = {
        "page_size": 200,
        "vehicle":  vehicle_id,
        "company": company_id,
    }
    print("payloadUer: ",payload)

    try:
        response = requests.post(url, headers=AUTHORIZATION_HEADER, json=payload)
        if response.status_code == 200:
            data = response.json()
            print("userData: ", data)
            users = data.get("data", {}).get("users", [])
            #print("users: ", users)
            users = [
                {
                    "fullName": c.get("firstName") + " " + c.get("lastName"),
                } for c in users
            ]
            print("users: ", users)
            return users
        else:
            logger.error(f"Error fetching vehicles: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        logger.error(f"Exception in get_filtered_vehicles: {str(e)}")
        return None


def get_shift(date, vehicle, companyID):
    vehicle = json.loads(vehicle)
    date_obj = datetime.strptime(date, "%Y-%m-%dT%H:%M:%S")
    start_window = date_obj - timedelta(days=2)
    end_window = date_obj + timedelta(days=2)
    driver_info_list = []

    url = "https://dev-api.meinfahrer.app/api/v1/admin/shift/getAll"
    payload = {
        "company": companyID,
        "vehicle": vehicle['id'],
        "startDate": start_window.strftime("%Y-%m-%d"),
        "endDate": end_window.strftime("%Y-%m-%d"),
        "page_size": 50,
    }

    try:
        response = requests.post(url, headers=AUTHORIZATION_HEADER, json=payload)
        if response.status_code == 200:
            shifts = response.json().get('data', {}).get('shifts', [])
            if not shifts:
                return []

            # Listen für Schichten vor und nach dem angegebenen Datum
            shifts_before = []
            shifts_after = []
            exact_shifts = []

            for shift in shifts:
                shift_start_str = shift.get('startDate')
                shift_end_str = shift.get('endDate')
                if shift_start_str and shift_end_str:
                    shift_start = datetime.strptime(shift_start_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                    shift_end = datetime.strptime(shift_end_str, "%Y-%m-%dT%H:%M:%S.%fZ")

                    driver = shift.get('driver', {})
                    driver_info = {
                        'first_name': driver.get('firstName', ''),
                        'last_name': driver.get('lastName', ''),
                        'date_of_birth': driver.get('dateOfBirth', ''),
                        'full_address': driver.get('streetAndHouseNumber', ''),
                        'postal_code_city': driver.get('postalCodeCityDistrict', ''),
                        'shift_start': shift_start_str,
                        'shift_end': shift_end_str,
                        'place_of_birth': driver.get('placeOfBirth', ''),
                    }

                    if shift_start <= date_obj <= shift_end:
                        exact_shifts.append(driver_info)
                    elif shift_end < date_obj:
                        shifts_before.append((shift_end, driver_info))
                    elif shift_start > date_obj:
                        shifts_after.append((shift_start, driver_info))

            # Sortieren der Schichten nach Nähe zum Datum
            shifts_before.sort(key=lambda x: date_obj - x[0])
            shifts_after.sort(key=lambda x: x[0] - date_obj)
            print("shifts_before: ", shifts_before)
            print("shifts_after: ", shifts_after)
            result = {
                'exact_shifts': exact_shifts,
                'shifts_before': [shifts_before[0]],
                'shifts_after': [shifts_after[0]]
            }

            return result
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
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": (
                "You are an intelligent assistant tasked with identifying vehicles based on user-provided license plate input. "
                "You are provided with a list of vehicles and their details, including license plates in various formats. "
                "Your task is to match the user input to the most likely vehicle by identifying similarities in the license plate, "
                "even if the format varies (e.g., 'B-E-1234' is the same as 'BE1234' or 'b-e123'). "
                "If no match can be found with reasonable confidence, return a clear response indicating that no matching vehicle was found for the specified company. Pls write the number in latine letters"
            )
        },
        {
            "role": "assistant",
            "content": f"The following is the list of vehicles: {vehicles}"
        },
        {
            "role": "user",
            "content": f"I want to find the vehicle with license plate, if there is any Information about: {user_input}"
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
                        "description": "The model of the identified vehicle, if found else return empty string."
                    },
                    "plate": {
                        "type": "string",
                        "description": "The plate of the identified vehicle, if found else return empty string."
                    },
                    "id": {
                        "type": "string",
                        "description": "The unique ID of the identified vehicle, if found else return empty string."
                    }
                },
                "required": ["model", "plate", "id"],
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
    print("completion: ", completion.choices[0].message.content)
    return completion.choices[0].message.content  # Gibt die JSON-Antwort zurück

def get_filtered_companies():
    url = "https://dev-api.meinfahrer.app/api/v1/admin/company/getAll"
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
 #   all_companies = get_filtered_companies()
#    company = determine_company(user_input_company, all_companies)
    company = user_input_company
    if not company.get('id'):
        return f"Kein Unternehmen gefunden zu dem Namen: {user_input_company}"
    
    all_filtered_vehicles = get_filtered_vehicles(company['id'])
    vehicle_plate = determine_vehicle(user_input_license_plate, all_filtered_vehicles)
    vehicle_plate1 = json.loads(vehicle_plate)
    if not vehicle_plate1['id']:
        return "Kein Fahrzeug gefunden. mit der Kennzeichen: " + user_input_license_plate
    driver_shifts = get_shift(user_input_datetime, vehicle_plate, company['id'])

    if not driver_shifts:
        return "Keine Schichten gefunden für die Zeit: " + user_input_datetime + " mit dem Fahrzeug: " + vehicle_plate1['plate']

    exact_shifts = driver_shifts.get('exact_shifts', [])
    shifts_before = driver_shifts.get('shifts_before', [])
    shifts_after = driver_shifts.get('shifts_after', [])

    if exact_shifts:
        driver_info = exact_shifts[0]
        return (
            f"Die Rückgabewerte sind:\n"
            f"Fahrzeug: {vehicle_plate}\n"
            f"Fahrer: {driver_info}"
        )
    else:
        response = f"Keine Schichten gefunden zum genauen Zeitpunkt.\n"
        potential_drivers = []
        associated_driver_to_vehicle = []
        if shifts_before:
            response += "Mögliche Fahrer vor dem Zeitpunkt:\n"
            for driver_info in shifts_before[:3]:  # Nimmt die ersten drei Schichten davor
                potential_drivers.append(driver_info)
                response += f"{driver_info}\n"

        if shifts_after:
            response += "Mögliche Fahrer nach dem Zeitpunkt:\n"
            for driver_info in shifts_after[:3]:  # Nimmt die ersten drei Schichten danach
                potential_drivers.append(driver_info)
                response += f"{driver_info}\n"
        
        drivers_that_accosiated_with_that_car = get_driver_by_company_vehicle(json.loads(vehicle_plate)['id'], company['id'])
        print("drivers_that_accosiated_with_that_car: ",drivers_that_accosiated_with_that_car)
        associated_driver_to_vehicle = [driver for driver in drivers_that_accosiated_with_that_car]

        if(associated_driver_to_vehicle):
            response += f"Alle Fahrer die zu dem Auto zugeordnet sind: {associated_driver_to_vehicle}\n"
        if not potential_drivers:
            response += "Keine potenziellen Fahrer gefunden."

        return response