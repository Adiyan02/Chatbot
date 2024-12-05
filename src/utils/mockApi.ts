import { format } from 'date-fns';

export const fetchDriverInfo = async (licensePlate: string, datetime: string) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock response
  return {
    driverName: "Max Mustermann",
    driverEmail: "max.mustermann@example.com",
    driverLicense: "B123456789",
    address: "Musterstraße 123, 12345 Berlin"
  };
};

export const sendEmailToAuthority = async (
  driverInfo: any,
  ticketInfo: { licensePlate: string; dateTime: string; location: string }
) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const emailTemplate = `
    Sehr geehrte Damen und Herren,

    hiermit bestätige ich, dass ich, ${driverInfo.driverName}, am ${format(new Date(ticketInfo.dateTime), 'dd.MM.yyyy HH:mm')} Uhr
    das Fahrzeug mit dem Kennzeichen ${ticketInfo.licensePlate} am Standort ${ticketInfo.location} geführt habe.

    Mit freundlichen Grüßen,
    ${driverInfo.driverName}
  `;
  
  return {
    success: true,
    message: "Email wurde erfolgreich versendet",
    emailContent: emailTemplate
  };
};