from decimal import Decimal

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.centre import AkshayaCentre
from app.models.service import (
    CentreSupportedService,
    Service,
    ServiceDocumentRequirement,
    ServiceRequirementAllowedFileType,
)


def seed_services():
    db = SessionLocal()

    # 5MB in bytes
    max_size = 5 * 1024 * 1024

    allowed_types = ["application/pdf", "image/jpeg", "image/png"]

    # Pre-defined Centres
    centres_data = [
        {
            "name": "Akshaya Centre Thiruvananthapuram (Pattom)",
            "code": "AKC_TVM_01",
            "address_text": "Ground Floor, Pattom Palace Building, TVM",
            "locality": "Pattom",
            "district": "Thiruvananthapuram",
            "pincode": "695004",
            "latitude": 8.524139,
            "longitude": 76.936638,
        },
        {
            "name": "Akshaya Centre Koovappally",
            "code": "AKC_EKM_01",
            "address_text": "Akshaya Centre, Koovappally P.O., Kottayam",
            "locality": "Koovappally",
            "district": "Koovappally",
            "pincode": "686517",
            "latitude": 9.531200,
            "longitude": 76.842300,
        },
        {
            "name": "Akshaya Centre Kozhikode (Mavoor Road)",
            "code": "AKC_KKD_01",
            "address_text": "Opposite KSRTC Bus Stand, Mavoor Road, Calicut",
            "locality": "Mavoor Road",
            "district": "Kozhikode",
            "pincode": "673001",
            "latitude": 11.258753,
            "longitude": 75.780410,
        },
        {
            "name": "Akshaya Centre Thrissur (Swaraj Round)",
            "code": "AKC_TCR_01",
            "address_text": "Swaraj Round North, Near Vadakkumnathan Temple",
            "locality": "Swaraj Round",
            "district": "Thrissur",
            "pincode": "680001",
            "latitude": 10.527641,
            "longitude": 76.214434,
        },
    ]

    # Seed Centres
    db_centres = []
    for cdata in centres_data:
        centre = db.scalar(select(AkshayaCentre).where(AkshayaCentre.code == cdata["code"]))
        if not centre:
            centre = AkshayaCentre(
                name=cdata["name"],
                code=cdata["code"],
                address_text=cdata["address_text"],
                locality=cdata["locality"],
                district=cdata["district"],
                pincode=cdata["pincode"],
                latitude=cdata["latitude"],
                longitude=cdata["longitude"],
                is_active=True,
            )
            db.add(centre)
            db.flush()
            print(f"Created centre: {centre.name}")
        db_centres.append(centre)

    services_data = [
        # CATEGORY A
        {
            "name": "Income Certificate",
            "code": "INC_CERT",
            "service_type": "A",
            "description": (
                "Official state certificate verifying annual household income for scholarship, tax, and government benefits."
            ),
            "base_fee": Decimal("50.00"),
            "docs": [
                {"name": "Proof of Income", "type": "REQUIRED"},
                {"name": "Basic Tax Payment Receipt", "type": "REQUIRED"},
                {"name": "Ration Card", "type": "REQUIRED"},
                {"name": "Land Tax Receipt", "type": "CONDITIONAL"},
                {"name": "Salary Certificate", "type": "CONDITIONAL"},
            ],
        },
        {
            "name": "Residence Certificate",
            "code": "RES_CERT",
            "service_type": "A",
            "description": "Proof of residence certificate issued by the Revenue Department for official and administrative purposes.",
            "base_fee": Decimal("50.00"),
            "docs": [
                {"name": "Aadhaar Card", "type": "REQUIRED"},
                {"name": "Voter ID", "type": "REQUIRED"},
                {"name": "Ration Card", "type": "REQUIRED"},
            ],
        },
        {
            "name": "Community Certificate",
            "code": "COM_CERT",
            "service_type": "A",
            "description": "Authorized caste and community verification certificate for educational admissions and welfare schemes.",
            "base_fee": Decimal("50.00"),
            "docs": [
                {"name": "Ration Card", "type": "REQUIRED"},
                {"name": "School Leaving Certificate", "type": "REQUIRED"},
            ],
        },
        {
            "name": "Nativity Certificate",
            "code": "NAT_CERT",
            "service_type": "A",
            "description": "Official certification proving birth, domicile, and nativity origin in the State of Kerala.",
            "base_fee": Decimal("50.00"),
            "docs": [
                {"name": "Birth Certificate", "type": "REQUIRED"},
                {"name": "Ration Card", "type": "REQUIRED"},
                {"name": "Parent's School Certificate", "type": "REQUIRED"},
            ],
        },
        {
            "name": "PAN Card Services",
            "code": "PAN_SRV",
            "service_type": "A",
            "description": "Application for new Permanent Account Number (PAN) card and correction of taxpayer records.",
            "base_fee": Decimal("100.00"),
            "docs": [
                {"name": "Proof of Identity", "type": "REQUIRED"},
                {"name": "Proof of Address", "type": "REQUIRED"},
                {"name": "Proof of Date of Birth", "type": "REQUIRED"},
                {"name": "Photograph", "type": "REQUIRED"},
                {"name": "Signature", "type": "REQUIRED"},
            ],
        },
        # PREVIOUS CATEGORY B (Now Fully Digital Type A)
        {
            "name": "Passport Service",
            "code": "PASS_SRV",
            "service_type": "A",
            "description": (
                "Online passport application processing, document pre-validation, and Seva Kendra appointment assistance."
            ),
            "base_fee": Decimal("150.00"),
            "docs": [
                {"name": "Proof of Identity", "type": "REQUIRED"},
                {"name": "Proof of Address", "type": "REQUIRED"},
                {"name": "Proof of Date of Birth", "type": "REQUIRED"},
                {"name": "Photograph", "type": "REQUIRED"},
                {"name": "Existing Passport", "type": "CONDITIONAL"},
            ],
        },
        {
            "name": "Voter Registration / Election ID",
            "code": "VOTER_REG",
            "service_type": "A",
            "description": (
                "Electoral roll voter registration, electoral photo identity card (EPIC) issuance, and address updates."
            ),
            "base_fee": Decimal("0.00"),
            "docs": [
                {"name": "Passport-size Photograph", "type": "REQUIRED"},
                {"name": "Identity Proof", "type": "REQUIRED"},
                {"name": "Address Proof", "type": "REQUIRED"},
            ],
        },
        {
            "name": "Birth Certificate",
            "code": "BIRTH_CERT",
            "service_type": "A",
            "description": "Official vital registration and digital certificate issuance for births in local self-governments.",
            "base_fee": Decimal("50.00"),
            "docs": [
                {"name": "Applicant/Parent Identity Proof", "type": "REQUIRED"},
                {"name": "Supporting Birth-related Document", "type": "CONDITIONAL"},
            ],
        },
        {
            "name": "Death Certificate",
            "code": "DEATH_CERT",
            "service_type": "A",
            "description": "Official vital registration and legal certificate issuance for deaths registered with local authorities.",
            "base_fee": Decimal("50.00"),
            "docs": [
                {"name": "Applicant Identity Proof", "type": "REQUIRED"},
                {"name": "Supporting Death-related Document", "type": "CONDITIONAL"},
            ],
        },
        {
            "name": "Marriage Certificate",
            "code": "MARRIAGE_CERT",
            "service_type": "A",
            "description": "Formal legal registration and certificate issuance for marriages under statutory registration rules.",
            "base_fee": Decimal("100.00"),
            "docs": [
                {"name": "Identity Proof of Applicant(s)", "type": "REQUIRED"},
                {"name": "Age/Date-of-Birth Proof", "type": "REQUIRED"},
                {"name": "Marriage-related Supporting Document", "type": "CONDITIONAL"},
            ],
        },
        # PREVIOUS CATEGORY C (Now Fully Digital Type A)
        {
            "name": "Aadhaar Enrollment",
            "code": "AADHAAR_ENR",
            "service_type": "A",
            "description": (
                "New 12-digit Aadhaar unique identification enrollment and biometric capture assistance."
            ),
            "base_fee": Decimal("0.00"),
            "docs": [
                {"name": "Identity/Supporting Document", "type": "REQUIRED"},
                {"name": "Address/Supporting Document", "type": "REQUIRED"},
            ],
        },
        {
            "name": "Aadhaar Updation",
            "code": "AADHAAR_UPD",
            "service_type": "A",
            "description": "Update mobile number, address, photograph, and demographic records in the UIDAI database.",
            "base_fee": Decimal("50.00"),
            "docs": [
                {"name": "Name Update Proof", "type": "CONDITIONAL"},
                {"name": "Date of Birth Update Proof", "type": "CONDITIONAL"},
                {"name": "Address Update Proof", "type": "CONDITIONAL"},
            ],
        },
        {
            "name": "Jeevan Pramaan / Life Certificate",
            "code": "JEEVAN_PRAMAAN",
            "service_type": "A",
            "description": (
                "Digital biometric life certificate generation and submission for state and central pensioners."
            ),
            "base_fee": Decimal("70.00"),
            "docs": [
                {"name": "Aadhaar Details/Proof", "type": "REQUIRED"},
                {"name": "Pension-related Details/Document", "type": "CONDITIONAL"},
            ],
        },
    ]

    for sdata in services_data:
        # Check if service already exists
        service = db.scalar(select(Service).where(Service.code == sdata["code"]))
        if not service:
            service = Service(
                name=sdata["name"],
                code=sdata["code"],
                service_type=sdata["service_type"],
                description=sdata["description"],
                base_fee=sdata["base_fee"],
                is_active=True,
            )
            db.add(service)
            db.flush()
            print(f"Created service: {service.name}")
        else:
            service.service_type = sdata["service_type"]
            db.add(service)

        # Link to all centres
        for centre in db_centres:
            css = db.scalar(
                select(CentreSupportedService).where(
                    CentreSupportedService.centre_id == centre.id,
                    CentreSupportedService.service_id == service.id,
                )
            )
            if not css:
                css = CentreSupportedService(
                    centre_id=centre.id, service_id=service.id, is_active=True
                )
                db.add(css)
                db.flush()
                print(f"  Linked to centre: {centre.name}")

        # Add documents
        for i, doc_data in enumerate(sdata["docs"]):
            doc_req = db.scalar(
                select(ServiceDocumentRequirement).where(
                    ServiceDocumentRequirement.service_id == service.id,
                    ServiceDocumentRequirement.name == doc_data["name"],
                )
            )
            if not doc_req:
                doc_req = ServiceDocumentRequirement(
                    service_id=service.id,
                    name=doc_data["name"],
                    requirement_type=doc_data["type"],
                    max_file_size_bytes=max_size,
                    sort_order=i,
                    is_active=True,
                )
                db.add(doc_req)
                db.flush()

                # Add allowed file types
                for mime in allowed_types:
                    af = ServiceRequirementAllowedFileType(
                        requirement_id=doc_req.id, mime_type=mime
                    )
                    db.add(af)
                print(f"  Added document requirement: {doc_req.name}")
            else:
                # Update existing
                doc_req.requirement_type = doc_data["type"]
                doc_req.max_file_size_bytes = max_size
                db.add(doc_req)

    db.commit()
    db.close()
    print("Seed complete.")


if __name__ == "__main__":
    seed_services()
