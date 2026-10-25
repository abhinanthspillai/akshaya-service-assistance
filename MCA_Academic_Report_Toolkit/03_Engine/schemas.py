try:
    from .styles import (
        add_heading_1, add_heading_2, add_body_p, add_styled_table
    )
except ImportError:
    from styles import (
        add_heading_1, add_heading_2, add_body_p, add_styled_table
    )

def add_all_database_schemas(doc, cfg=None):
    """
    Renders database schemas. If custom schemas are present in cfg, renders authentic project schemas.
    Otherwise renders standard 31 collections adhering to academic zero-mockup format.
    """
    if cfg is None:
        cfg = {}

    custom_schemas = cfg.get("database_schemas", [])
    if custom_schemas:
        add_heading_2(doc, f"4.4.2 Table / Collection Design ({len(custom_schemas)} Schemas)")
        add_body_p(
            doc,
            f"The complete database schema specifications extracted from the project architecture are detailed below, "
            "following the standard academic format defining primary keys, foreign keys, field names, datatypes, constraints, and descriptions:"
        )
        tbl_headers = ["No:", "Field name", "Datatype (Size)", "Key Constraints", "Description of the field"]
        widths = [0.4, 1.35, 1.3, 1.25, 1.7]

        for idx, s in enumerate(custom_schemas):
            tbl_name = s.get("table_name", f"table_{idx+1}")
            add_heading_2(doc, f"{idx+1}. {tbl_name}")
            add_body_p(doc, f"Description: {s.get('description', 'Relational entity table')}\nPrimary key: {s.get('primary_key', 'id')}\nForeign key: {s.get('foreign_key', 'Nil')}")
            rows = []
            for f_idx, f in enumerate(s.get("fields", [])):
                rows.append([
                    str(f_idx + 1),
                    f.get("field", ""),
                    f.get("type", "Varchar(100)"),
                    f.get("constraints", "Not Null"),
                    f.get("description", "")
                ])
            if rows:
                add_styled_table(doc, tbl_headers, rows, widths, f"Table 4.{idx+10}: Schema Specification for {tbl_name}")
        return

    add_heading_2(doc, "4.4.2 Table / Collection Design (31 Schemas)")
    add_body_p(
        doc,
        "The complete schema specifications for all 31 database collections and subcollections powering the platform are detailed below, "
        "following the standard academic format defining primary keys, foreign keys, field names, datatypes, constraints, and descriptions:"
    )

    tbl_headers = ["No:", "Field name", "Datatype (Size)", "Key Constraints", "Description of the field"]
    widths = [0.4, 1.35, 1.3, 1.25, 1.7]

    # 1. tbl_users
    add_heading_2(doc, "1. tbl_users (users)")
    add_body_p(doc, "Primary key: uid\nForeign key: Nil")
    tbl_users_rows = [
        ["1", "uid", "Varchar(28)", "Primary key, Not Null", "Unique Firebase Auth user identifier"],
        ["2", "name", "Varchar(100)", "Not Null", "Full legal name of the user"],
        ["3", "email", "Varchar(100)", "Unique, Not Null", "User email address for account recovery"],
        ["4", "phone", "Varchar(15)", "Not Null", "Contact telephone number"],
        ["5", "role", "Enum('customer','provider','admin')", "Not Null", "Role classification governing access permissions"],
        ["6", "status", "Enum('ACTIVE','PENDING','SUSPENDED')", "Not Null", "Account verification and operational state"],
        ["7", "profileImageUrl", "Varchar(500)", "Optional", "Storage URI for user avatar picture"],
        ["8", "fcmToken", "Varchar(256)", "Optional", "FCM device registration token for push alerts"],
        ["9", "createdAt", "Timestamp", "Not Null", "Server timestamp marking account creation date"]
    ]
    add_styled_table(doc, tbl_headers, tbl_users_rows, widths, "Table 4.1: Master User Accounts Schema (tbl_users)")

    # 2. tbl_user_addresses
    add_heading_2(doc, "2. tbl_user_addresses (users/{userId}/addresses)")
    add_body_p(doc, "Primary key: addressId\nForeign key: userId references tbl_users")
    tbl_addr_rows = [
        ["1", "addressId", "Varchar(36)", "Primary key, Not Null", "Unique identifier for saved delivery address"],
        ["2", "userId", "Varchar(28)", "Foreign key, Not Null", "References uid of parent user in tbl_users"],
        ["3", "title", "Varchar(50)", "Not Null", "Address label (e.g. Home, Office, Site)"],
        ["4", "addressLine", "Varchar(250)", "Not Null", "Detailed street, house name, and landmark"],
        ["5", "city", "Varchar(100)", "Not Null", "City or town locality name"],
        ["6", "district", "Varchar(50)", "Not Null", "Administrative district name"],
        ["7", "pincode", "Varchar(10)", "Not Null", "Postal index code"],
        ["8", "latitude", "Decimal(10,6)", "Not Null", "GPS latitude coordinate for dispatch routing"],
        ["9", "longitude", "Decimal(10,6)", "Not Null", "GPS longitude coordinate for dispatch routing"],
        ["10", "isDefault", "Boolean", "Not Null", "Flag indicating default service address"]
    ]
    add_styled_table(doc, tbl_headers, tbl_addr_rows, widths, "Table 4.2: Saved User Addresses Subcollection Schema (tbl_user_addresses)")

    # 3. tbl_provider_kyc
    add_heading_2(doc, "3. tbl_provider_kyc (users/{providerId}/kyc_documents)")
    add_body_p(doc, "Primary key: docId\nForeign key: providerId references tbl_users")
    tbl_kyc_rows = [
        ["1", "docId", "Varchar(36)", "Primary key, Not Null", "Unique identifier for uploaded verification document"],
        ["2", "providerId", "Varchar(28)", "Foreign key, Not Null", "References provider uid in tbl_users"],
        ["3", "docType", "Enum('AADHAAR','LICENSE','CERTIFICATE')", "Not Null", "Category of identification document"],
        ["4", "docNumber", "Varchar(50)", "Not Null", "Government registration or identity number"],
        ["5", "fileUrl", "Varchar(500)", "Not Null", "Firebase Storage URI for original document scan"],
        ["6", "verificationStatus", "Enum('PENDING','VERIFIED','REJECTED')", "Not Null", "Administrative KYC approval status"],
        ["7", "submittedAt", "Timestamp", "Not Null", "Submission timestamp"],
        ["8", "verifiedAt", "Timestamp", "Optional", "Timestamp when administrator verified document"],
        ["9", "rejectionReason", "Varchar(250)", "Optional", "Feedback provided if document was rejected"]
    ]
    add_styled_table(doc, tbl_headers, tbl_kyc_rows, widths, "Table 4.3: Provider KYC Documents Subcollection Schema (tbl_provider_kyc)")

    # 4. tbl_provider_leaves
    add_heading_2(doc, "4. tbl_provider_leaves (users/{providerId}/leaves)")
    add_body_p(doc, "Primary key: leaveId\nForeign key: providerId references tbl_users")
    tbl_leave_rows = [
        ["1", "leaveId", "Varchar(36)", "Primary key, Not Null", "Unique identifier for provider unavailability block"],
        ["2", "providerId", "Varchar(28)", "Foreign key, Not Null", "References provider uid in tbl_users"],
        ["3", "startDate", "Varchar(15)", "Not Null", "Start date of leave period (YYYY-MM-DD)"],
        ["4", "endDate", "Varchar(15)", "Not Null", "End date of leave period (YYYY-MM-DD)"],
        ["5", "reason", "Varchar(250)", "Optional", "Stated reason for absence or maintenance downtime"],
        ["6", "status", "Enum('ACTIVE','CANCELLED')", "Not Null", "Operational status of leave record"],
        ["7", "createdAt", "Timestamp", "Not Null", "Timestamp marking schedule creation"]
    ]
    add_styled_table(doc, tbl_headers, tbl_leave_rows, widths, "Table 4.4: Provider Leaves Subcollection Schema (tbl_provider_leaves)")

    # 5. tbl_services
    add_heading_2(doc, "5. tbl_services (services)")
    add_body_p(doc, "Primary key: serviceId\nForeign key: categoryId references tbl_service_categories")
    tbl_serv_rows = [
        ["1", "serviceId", "Varchar(32)", "Primary key, Not Null", "Unique identifier for platform service catalog item"],
        ["2", "name", "Varchar(100)", "Not Null", "Display name of the trade service (e.g. Electrician)"],
        ["3", "category", "Varchar(50)", "Indexed, Not Null", "Category classification name"],
        ["4", "basePrice", "Decimal(10,2)", "Not Null", "Baseline diagnostic and inspection fee in INR"],
        ["5", "durationMinutes", "Int(4)", "Not Null", "Estimated standard duration for service completion"],
        ["6", "imageUrl", "Varchar(500)", "Not Null", "Cloud Storage URI for service banner image"],
        ["7", "description", "Varchar(500)", "Not Null", "Detailed description of service deliverables"],
        ["8", "isActive", "Boolean", "Not Null", "Flag indicating whether service is active in catalog"]
    ]
    add_styled_table(doc, tbl_headers, tbl_serv_rows, widths, "Table 4.5: Master Service Catalog Schema (tbl_services)")

    # 6. tbl_service_categories
    add_heading_2(doc, "6. tbl_service_categories (service_categories)")
    add_body_p(doc, "Primary key: categoryId\nForeign key: Nil")
    tbl_scat_rows = [
        ["1", "categoryId", "Varchar(32)", "Primary key, Not Null", "Unique identifier for service category"],
        ["2", "categoryName", "Varchar(50)", "Unique, Not Null", "Category title (Electrical, Plumbing, HVAC, Carpentry)"],
        ["3", "iconUrl", "Varchar(500)", "Not Null", "Cloud Storage URI for vector category icon"],
        ["4", "displayOrder", "Int(4)", "Not Null", "Sorting priority sequence on customer dashboard"],
        ["5", "isActive", "Boolean", "Not Null", "Flag indicating whether category is actively visible"]
    ]
    add_styled_table(doc, tbl_headers, tbl_scat_rows, widths, "Table 4.6: Service Categories Schema (tbl_service_categories)")

    # 7. tbl_provider_services
    add_heading_2(doc, "7. tbl_provider_services (provider_services)")
    add_body_p(doc, "Primary key: providerServiceId\nForeign key: providerId references tbl_users, serviceId references tbl_services")
    tbl_pserv_rows = [
        ["1", "providerServiceId", "Varchar(36)", "Primary key, Not Null", "Unique identifier for provider-specific service offering"],
        ["2", "providerId", "Varchar(28)", "Foreign key, Not Null", "References provider uid in tbl_users"],
        ["3", "serviceId", "Varchar(32)", "Foreign key, Not Null", "References serviceId in tbl_services"],
        ["4", "customHourlyRate", "Decimal(10,2)", "Not Null", "Provider's customized hourly rate in INR"],
        ["5", "experienceYears", "Int(3)", "Not Null", "Documented professional trade experience years"],
        ["6", "isActive", "Boolean", "Not Null", "Flag indicating active provider offering status"]
    ]
    add_styled_table(doc, tbl_headers, tbl_pserv_rows, widths, "Table 4.7: Provider Custom Offerings Schema (tbl_provider_services)")

    # 8. tbl_category_requests
    add_heading_2(doc, "8. tbl_category_requests (category_requests)")
    add_body_p(doc, "Primary key: requestId\nForeign key: providerId references tbl_users")
    tbl_creq_rows = [
        ["1", "requestId", "Varchar(36)", "Primary key, Not Null", "UUID identifying category addition proposal"],
        ["2", "providerId", "Varchar(28)", "Foreign key, Not Null", "References proposing provider uid in tbl_users"],
        ["3", "requestedCategoryName", "Varchar(100)", "Not Null", "Proposed trade category title"],
        ["4", "description", "Varchar(500)", "Not Null", "Rationale and market demand description"],
        ["5", "status", "Enum('PENDING','APPROVED','REJECTED')", "Not Null", "Administrative approval review state"],
        ["6", "adminNotes", "Varchar(250)", "Optional", "Administrative decision comments"],
        ["7", "createdAt", "Timestamp", "Not Null", "Submission timestamp"]
    ]
    add_styled_table(doc, tbl_headers, tbl_creq_rows, widths, "Table 4.8: Category Addition Proposals Schema (tbl_category_requests)")

    # 9. tbl_bookings
    add_heading_2(doc, "9. tbl_bookings (bookings)")
    add_body_p(doc, "Primary key: bookingId\nForeign key: customerId references tbl_users, providerId references tbl_users")
    tbl_book_rows = [
        ["1", "bookingId", "Varchar(36)", "Primary key, Not Null", "UUID identifying service booking transaction"],
        ["2", "customerId", "Varchar(28)", "Foreign key, Not Null", "References customer uid in tbl_users"],
        ["3", "providerId", "Varchar(28)", "Foreign key, Optional", "References assigned provider uid in tbl_users"],
        ["4", "serviceId", "Varchar(32)", "Foreign key, Not Null", "References serviceId in tbl_services"],
        ["5", "serviceTitle", "Varchar(100)", "Not Null", "Title of booked trade service"],
        ["6", "status", "Varchar(25)", "Not Null", "State: PENDING, ACCEPTED, EN_ROUTE, ARRIVED, COMPLETED"],
        ["7", "price", "Decimal(10,2)", "Not Null", "Agreed quotation price in INR"],
        ["8", "date", "Varchar(15)", "Not Null", "Scheduled date (YYYY-MM-DD)"],
        ["9", "time", "Varchar(15)", "Not Null", "Scheduled appointment time slot"],
        ["10", "address", "Varchar(250)", "Not Null", "Delivery address for technician dispatch"],
        ["11", "providerLat", "Decimal(10,6)", "Optional", "Current GPS latitude of assigned provider"],
        ["12", "providerLng", "Decimal(10,6)", "Optional", "Current GPS longitude of assigned provider"],
        ["13", "completionOtp", "Varchar(6)", "Not Null", "Cryptographic 6-digit OTP for escrow release"],
        ["14", "paymentStatus", "Enum('PENDING','ESCROW_HELD','RELEASED')", "Not Null", "Financial escrow settlement state"],
        ["15", "createdAt", "Timestamp", "Not Null", "Server timestamp marking booking creation"]
    ]
    add_styled_table(doc, tbl_headers, tbl_book_rows, widths, "Table 4.9: Service Booking Transactions Schema (tbl_bookings)")

    # 10. tbl_booking_verifications
    add_heading_2(doc, "10. tbl_booking_verifications (booking_completion_verifications)")
    add_body_p(doc, "Primary key: verificationId\nForeign key: bookingId references tbl_bookings")
    tbl_bver_rows = [
        ["1", "verificationId", "Varchar(36)", "Primary key, Not Null", "Unique verification transaction identifier"],
        ["2", "bookingId", "Varchar(36)", "Foreign key, Not Null", "References bookingId in tbl_bookings"],
        ["3", "otpHash", "Varchar(64)", "Not Null", "SHA-256 cryptographic hash of completion OTP"],
        ["4", "attemptCount", "Int(2)", "Not Null", "Failed verification attempts counter (max 3)"],
        ["5", "verifiedAt", "Timestamp", "Optional", "Timestamp when customer OTP was authenticated"],
        ["6", "verifiedBy", "Varchar(28)", "Foreign key, Optional", "UID of authenticating provider"]
    ]
    add_styled_table(doc, tbl_headers, tbl_bver_rows, widths, "Table 4.10: OTP Verification & Escrow Release Schema (tbl_booking_verifications)")

    # 11. tbl_rentals
    add_heading_2(doc, "11. tbl_rentals (rentals)")
    add_body_p(doc, "Primary key: rentalId\nForeign key: customerId references tbl_users, toolId references tbl_rental_catalog")
    tbl_rent_rows = [
        ["1", "rentalId", "Varchar(36)", "Primary key, Not Null", "UUID identifying equipment hire agreement"],
        ["2", "customerId", "Varchar(28)", "Foreign key, Not Null", "References customer uid in tbl_users"],
        ["3", "toolId", "Varchar(32)", "Foreign key, Not Null", "References toolId in tbl_rental_catalog"],
        ["4", "ownerProviderId", "Varchar(28)", "Foreign key, Not Null", "References owner provider uid in tbl_users"],
        ["5", "toolName", "Varchar(100)", "Not Null", "Name of rented industrial tool or equipment"],
        ["6", "dailyRate", "Decimal(10,2)", "Not Null", "Daily hire fee in INR"],
        ["7", "securityDeposit", "Decimal(10,2)", "Not Null", "Escrow deposit held during rental period"],
        ["8", "startDate", "Varchar(15)", "Not Null", "Commencement date of equipment rental"],
        ["9", "endDate", "Varchar(15)", "Not Null", "Scheduled return date of equipment"],
        ["10", "totalAmount", "Decimal(10,2)", "Not Null", "Total calculated rental fee in INR"],
        ["11", "rentalStatus", "Varchar(20)", "Not Null", "Status: BOOKED, ACTIVE, RETURNED, INSPECTED"],
        ["12", "escrowStatus", "Enum('HELD','REFUNDED','FORFEITED')", "Not Null", "Deposit return status"]
    ]
    add_styled_table(doc, tbl_headers, tbl_rent_rows, widths, "Table 4.11: Equipment Rental Agreements Schema (tbl_rentals)")

    # 12. tbl_rental_catalog
    add_heading_2(doc, "12. tbl_rental_catalog (rental_catalog)")
    add_body_p(doc, "Primary key: toolId\nForeign key: ownerProviderId references tbl_users")
    tbl_rcat_rows = [
        ["1", "toolId", "Varchar(32)", "Primary key, Not Null", "Unique identifier for rental inventory tool"],
        ["2", "ownerProviderId", "Varchar(28)", "Foreign key, Not Null", "References equipment owner uid in tbl_users"],
        ["3", "name", "Varchar(100)", "Not Null", "Equipment model name (e.g. Bosch Rotary Hammer)"],
        ["4", "category", "Varchar(50)", "Not Null", "Equipment category (Drilling, Cutting, Cleaning)"],
        ["5", "dailyRate", "Decimal(10,2)", "Not Null", "Standard daily rental price in INR"],
        ["6", "securityDeposit", "Decimal(10,2)", "Not Null", "Required refundable security deposit"],
        ["7", "totalQuantity", "Int(4)", "Not Null", "Total units in rental inventory fleet"],
        ["8", "availableQuantity", "Int(4)", "Not Null", "Units currently available for immediate hire"],
        ["9", "specifications", "Varchar(500)", "Not Null", "Power, wattage, and safety specifications"],
        ["10", "imageUrl", "Varchar(500)", "Not Null", "Cloud Storage URI for tool photograph"],
        ["11", "isActive", "Boolean", "Not Null", "Availability flag in catalog"]
    ]
    add_styled_table(doc, tbl_headers, tbl_rcat_rows, widths, "Table 4.12: Tool Inventory Fleet Schema (tbl_rental_catalog)")

    # 13. tbl_rental_categories
    add_heading_2(doc, "13. tbl_rental_categories (rental_categories)")
    add_body_p(doc, "Primary key: categoryId\nForeign key: Nil")
    tbl_rcats_rows = [
        ["1", "categoryId", "Varchar(32)", "Primary key, Not Null", "Unique identifier for equipment category"],
        ["2", "name", "Varchar(50)", "Unique, Not Null", "Category name (Power Tools, Ladders, Gardening)"],
        ["3", "iconUrl", "Varchar(500)", "Not Null", "Cloud Storage URI for category vector icon"],
        ["4", "displayOrder", "Int(4)", "Not Null", "Sorting priority sequence on rentals tab"]
    ]
    add_styled_table(doc, tbl_headers, tbl_rcats_rows, widths, "Table 4.13: Rental Categories Schema (tbl_rental_categories)")

    # 14. tbl_payments
    add_heading_2(doc, "14. tbl_payments (payments)")
    add_body_p(doc, "Primary key: paymentId\nForeign key: bookingId references tbl_bookings, customerId references tbl_users")
    tbl_pay_rows = [
        ["1", "paymentId", "Varchar(36)", "Primary key, Not Null", "Unique financial transaction identifier"],
        ["2", "bookingId", "Varchar(36)", "Foreign key, Optional", "References bookingId in tbl_bookings"],
        ["3", "rentalId", "Varchar(36)", "Foreign key, Optional", "References rentalId in tbl_rentals"],
        ["4", "customerId", "Varchar(28)", "Foreign key, Not Null", "References customer uid in tbl_users"],
        ["5", "razorpayOrderId", "Varchar(50)", "Unique, Not Null", "Gateway order identifier from Razorpay"],
        ["6", "razorpayPaymentId", "Varchar(50)", "Unique, Optional", "Gateway payment capture reference"],
        ["7", "amount", "Decimal(10,2)", "Not Null", "Total transaction amount in INR"],
        ["8", "paymentMethod", "Varchar(30)", "Not Null", "Method: UPI, CREDIT_CARD, NET_BANKING, WALLET"],
        ["9", "escrowStatus", "Enum('HELD','RELEASED','REFUNDED')", "Not Null", "Escrow balance state"],
        ["10", "createdAt", "Timestamp", "Not Null", "Payment execution timestamp"]
    ]
    add_styled_table(doc, tbl_headers, tbl_pay_rows, widths, "Table 4.14: Financial Transactions & Escrow Schema (tbl_payments)")

    # 15. tbl_withdrawals
    add_heading_2(doc, "15. tbl_withdrawals (withdrawals)")
    add_body_p(doc, "Primary key: withdrawalId\nForeign key: providerId references tbl_users")
    tbl_with_rows = [
        ["1", "withdrawalId", "Varchar(36)", "Primary key, Not Null", "UUID identifying provider payout request"],
        ["2", "providerId", "Varchar(28)", "Foreign key, Not Null", "References provider uid in tbl_users"],
        ["3", "amount", "Decimal(10,2)", "Not Null", "Requested payout amount in INR"],
        ["4", "bankAccountNumber", "Varchar(30)", "Not Null", "Destination bank account number"],
        ["5", "ifscCode", "Varchar(15)", "Not Null", "Bank branch IFSC routing code"],
        ["6", "status", "Enum('REQUESTED','PROCESSING','COMPLETED','REJECTED')", "Not Null", "Payout state"],
        ["7", "processedAt", "Timestamp", "Optional", "Timestamp when payout was settled"],
        ["8", "transactionReference", "Varchar(50)", "Optional", "Bank UTR or NEFT reference identifier"]
    ]
    add_styled_table(doc, tbl_headers, tbl_with_rows, widths, "Table 4.15: Provider Wallet Payouts Schema (tbl_withdrawals)")

    # 16. tbl_reviews
    add_heading_2(doc, "16. tbl_reviews (reviews)")
    add_body_p(doc, "Primary key: reviewId\nForeign key: bookingId references tbl_bookings, providerId references tbl_users")
    tbl_rev_rows = [
        ["1", "reviewId", "Varchar(36)", "Primary key, Not Null", "Unique identifier for customer review"],
        ["2", "bookingId", "Varchar(36)", "Foreign key, Not Null", "References bookingId in tbl_bookings"],
        ["3", "providerId", "Varchar(28)", "Foreign key, Not Null", "References provider uid in tbl_users"],
        ["4", "customerId", "Varchar(28)", "Foreign key, Not Null", "References customer uid in tbl_users"],
        ["5", "rating", "Decimal(2,1)", "Not Null, Check(1.0-5.0)", "Numerical star rating awarded"],
        ["6", "feedbackText", "Varchar(500)", "Optional", "Customer qualitative review comments"],
        ["7", "providerReply", "Varchar(500)", "Optional", "Provider's professional response comment"],
        ["8", "createdAt", "Timestamp", "Not Null", "Timestamp marking review submission"]
    ]
    add_styled_table(doc, tbl_headers, tbl_rev_rows, widths, "Table 4.16: Customer Ratings & Feedback Schema (tbl_reviews)")

    # 17. tbl_chat_channels
    add_heading_2(doc, "17. tbl_chat_channels (chat_channels)")
    add_body_p(doc, "Primary key: channelId\nForeign key: bookingId references tbl_bookings")
    tbl_cchan_rows = [
        ["1", "channelId", "Varchar(36)", "Primary key, Not Null", "Unique identifier for communication channel"],
        ["2", "bookingId", "Varchar(36)", "Foreign key, Not Null", "References active bookingId in tbl_bookings"],
        ["3", "customerUid", "Varchar(28)", "Foreign key, Not Null", "References customer uid in tbl_users"],
        ["4", "providerUid", "Varchar(28)", "Foreign key, Not Null", "References provider uid in tbl_users"],
        ["5", "lastMessageText", "Varchar(250)", "Optional", "Preview text of latest message sent"],
        ["6", "lastMessageTimestamp", "Timestamp", "Optional", "Timestamp of latest interaction"],
        ["7", "unreadCustomerCount", "Int(4)", "Not Null", "Unread message counter for customer"],
        ["8", "unreadProviderCount", "Int(4)", "Not Null", "Unread message counter for provider"]
    ]
    add_styled_table(doc, tbl_headers, tbl_cchan_rows, widths, "Table 4.17: Real-Time Chat Channels Schema (tbl_chat_channels)")

    # 18. tbl_chat_messages
    add_heading_2(doc, "18. tbl_chat_messages (chat_channels/{channelId}/messages)")
    add_body_p(doc, "Primary key: messageId\nForeign key: channelId references tbl_chat_channels")
    tbl_cmsg_rows = [
        ["1", "messageId", "Varchar(36)", "Primary key, Not Null", "UUID identifying individual message"],
        ["2", "channelId", "Varchar(36)", "Foreign key, Not Null", "References parent channel in tbl_chat_channels"],
        ["3", "senderId", "Varchar(28)", "Foreign key, Not Null", "UID of user transmitting message"],
        ["4", "recipientId", "Varchar(28)", "Foreign key, Not Null", "UID of intended recipient user"],
        ["5", "messageText", "Varchar(1000)", "Not Null", "Body text of communication"],
        ["6", "attachmentUrl", "Varchar(500)", "Optional", "Firebase Storage URI for diagnostic image"],
        ["7", "timestamp", "Timestamp", "Not Null", "Transmission timestamp"],
        ["8", "isRead", "Boolean", "Not Null", "Flag indicating whether message was read"]
    ]
    add_styled_table(doc, tbl_headers, tbl_cmsg_rows, widths, "Table 4.18: Chat Messages Subcollection Schema (tbl_chat_messages)")

    # 19. tbl_user_presence
    add_heading_2(doc, "19. tbl_user_presence (user_presence)")
    add_body_p(doc, "Primary key: userId\nForeign key: userId references tbl_users")
    tbl_pres_rows = [
        ["1", "userId", "Varchar(28)", "Primary key, Not Null", "References uid in tbl_users"],
        ["2", "isOnline", "Boolean", "Not Null", "Active socket/presence connection flag"],
        ["3", "lastSeen", "Timestamp", "Not Null", "Timestamp marking latest heartbeat ping"],
        ["4", "clientPlatform", "Varchar(20)", "Not Null", "Client platform identifier ('Android')"]
    ]
    add_styled_table(doc, tbl_headers, tbl_pres_rows, widths, "Table 4.19: Real-Time Presence Schema (tbl_user_presence)")

    # 20. tbl_live_locations
    add_heading_2(doc, "20. tbl_live_locations (live_location)")
    add_body_p(doc, "Primary key: providerId\nForeign key: providerId references tbl_users")
    tbl_loc_rows = [
        ["1", "providerId", "Varchar(28)", "Primary key, Not Null", "References provider uid in tbl_users"],
        ["2", "latitude", "Decimal(10,6)", "Not Null", "Real-time GPS latitude coordinate"],
        ["3", "longitude", "Decimal(10,6)", "Not Null", "Real-time GPS longitude coordinate"],
        ["4", "bearing", "Decimal(5,2)", "Not Null", "Compass direction heading in degrees (0-360)"],
        ["5", "speed", "Decimal(5,2)", "Not Null", "Current speed in meters per second"],
        ["6", "isOnline", "Boolean", "Not Null", "Duty status flag"],
        ["7", "updatedAt", "Timestamp", "Not Null", "High-frequency timestamp of telemetry transmission"]
    ]
    add_styled_table(doc, tbl_headers, tbl_loc_rows, widths, "Table 4.20: High-Frequency GPS Telemetry Schema (tbl_live_locations)")

    # 21. tbl_support_tickets
    add_heading_2(doc, "21. tbl_support_tickets (support_tickets)")
    add_body_p(doc, "Primary key: ticketId\nForeign key: userId references tbl_users")
    tbl_tick_rows = [
        ["1", "ticketId", "Varchar(36)", "Primary key, Not Null", "UUID identifying support dispute ticket"],
        ["2", "userId", "Varchar(28)", "Foreign key, Not Null", "References uid of reporting user"],
        ["3", "userRole", "Enum('customer','provider')", "Not Null", "Role classification of complainant"],
        ["4", "subject", "Varchar(100)", "Not Null", "Brief summary of issue or dispute"],
        ["5", "description", "Varchar(1000)", "Not Null", "Detailed narrative of complaint"],
        ["6", "status", "Enum('OPEN','IN_PROGRESS','RESOLVED')", "Not Null", "Current dispute status"],
        ["7", "priority", "Enum('LOW','MEDIUM','HIGH')", "Not Null", "Urgency level assigned to ticket"],
        ["8", "assignedAdminId", "Varchar(28)", "Foreign key, Optional", "UID of assigned admin investigator"],
        ["9", "createdAt", "Timestamp", "Not Null", "Timestamp marking ticket filing"],
        ["10", "updatedAt", "Timestamp", "Not Null", "Timestamp marking latest ticket update"]
    ]
    add_styled_table(doc, tbl_headers, tbl_tick_rows, widths, "Table 4.21: Customer & Provider Support Tickets Schema (tbl_support_tickets)")

    # 22. tbl_support_faqs
    add_heading_2(doc, "22. tbl_support_faqs (support_faqs)")
    add_body_p(doc, "Primary key: faqId\nForeign key: Nil")
    tbl_faq_rows = [
        ["1", "faqId", "Varchar(32)", "Primary key, Not Null", "Unique identifier for platform FAQ item"],
        ["2", "question", "Varchar(250)", "Not Null", "Frequently asked question prompt"],
        ["3", "answer", "Varchar(1000)", "Not Null", "Authoritative platform answer text"],
        ["4", "targetRole", "Enum('customer','provider','all')", "Not Null", "Audience filter for FAQ rendering"],
        ["5", "category", "Varchar(50)", "Not Null", "FAQ classification category"],
        ["6", "orderIndex", "Int(4)", "Not Null", "Display sorting sequence"],
        ["7", "isActive", "Boolean", "Not Null", "Publication visibility status"]
    ]
    add_styled_table(doc, tbl_headers, tbl_faq_rows, widths, "Table 4.22: Platform Knowledgebase FAQs Schema (tbl_support_faqs)")

    # 23. tbl_dynamic_island_templates
    add_heading_2(doc, "23. tbl_dynamic_island_templates (dynamic_island_templates)")
    add_body_p(doc, "Primary key: templateId\nForeign key: Nil")
    tbl_dit_rows = [
        ["1", "templateId", "Varchar(36)", "Primary key, Not Null", "UUID identifying notch HUD layout template"],
        ["2", "eventName", "Varchar(50)", "Indexed, Not Null", "Triggering lifecycle event (e.g. BookingAccepted)"],
        ["3", "targetRole", "Enum('customer','provider','all')", "Not Null", "Target audience for floating HUD"],
        ["4", "layoutJson", "Varchar(4000)", "Not Null", "Serialized element hierarchy (shapes, icons, texts)"],
        ["5", "isPublished", "Boolean", "Not Null", "Production publishing status flag"],
        ["6", "version", "Int(3)", "Not Null", "Template revision iteration number"],
        ["7", "updatedAt", "Timestamp", "Not Null", "Timestamp marking Admin Studio publication"]
    ]
    add_styled_table(doc, tbl_headers, tbl_dit_rows, widths, "Table 4.23: Dynamic Island Visual Layouts Schema (tbl_dynamic_island_templates)")

    # 24. tbl_system_config
    add_heading_2(doc, "24. tbl_system_config (system_config)")
    add_body_p(doc, "Primary key: configId\nForeign key: Nil")
    tbl_sconf_rows = [
        ["1", "configId", "Varchar(32)", "Primary key, Not Null", "Unique identifier for system configuration node"],
        ["2", "dailyReadLimit", "Int(8)", "Not Null", "Daily Firestore read quota limit (e.g. 50,000)"],
        ["3", "dailyWriteLimit", "Int(8)", "Not Null", "Daily Firestore write quota limit (e.g. 20,000)"],
        ["4", "dailyDeleteLimit", "Int(8)", "Not Null", "Daily Firestore delete quota limit (e.g. 5,000)"],
        ["5", "currentReadCount", "Int(8)", "Not Null", "Accumulated daily read counter"],
        ["6", "currentWriteCount", "Int(8)", "Not Null", "Accumulated daily write counter"],
        ["7", "currentDeleteCount", "Int(8)", "Not Null", "Accumulated daily delete counter"],
        ["8", "circuitBreakerState", "Enum('CLOSED','OPEN','HALF_OPEN')", "Not Null", "Operational circuit breaker status"],
        ["9", "lastResetDate", "Varchar(15)", "Not Null", "Target date for Pacific Time daily reset (YYYY-MM-DD)"]
    ]
    add_styled_table(doc, tbl_headers, tbl_sconf_rows, widths, "Table 4.24: Quota Guard & Circuit Breaker Schema (tbl_system_config)")

    # 25. tbl_audit_logs
    add_heading_2(doc, "25. tbl_audit_logs (audit_logs)")
    add_body_p(doc, "Primary key: logId\nForeign key: actorId references tbl_users")
    tbl_al_rows = [
        ["1", "logId", "Varchar(36)", "Primary key, Not Null", "UUID identifying administrative audit record"],
        ["2", "actorId", "Varchar(28)", "Foreign key, Not Null", "References uid of administrator or user"],
        ["3", "actorRole", "Varchar(20)", "Not Null", "Role classification of acting user"],
        ["4", "action", "Varchar(50)", "Not Null", "Action performed (KYC_APPROVED, BANNER_ADDED)"],
        ["5", "entityType", "Varchar(50)", "Not Null", "Target entity (user, service, template, booking)"],
        ["6", "entityId", "Varchar(36)", "Not Null", "Identifier of affected record"],
        ["7", "ipAddress", "Varchar(45)", "Optional", "Client IP address for security forensics"],
        ["8", "timestamp", "Timestamp", "Not Null", "Immutable server timestamp of action execution"]
    ]
    add_styled_table(doc, tbl_headers, tbl_al_rows, widths, "Table 4.25: Administrative Audit Governance Schema (tbl_audit_logs)")

    # 26. tbl_notifications
    add_heading_2(doc, "26. tbl_notifications (notifications)")
    add_body_p(doc, "Primary key: notificationId\nForeign key: recipientId references tbl_users")
    tbl_notif_rows = [
        ["1", "notificationId", "Varchar(36)", "Primary key, Not Null", "UUID identifying push notification message"],
        ["2", "recipientId", "Varchar(28)", "Foreign key, Not Null", "References recipient uid in tbl_users"],
        ["3", "title", "Varchar(100)", "Not Null", "Push alert title displayed in system notification tray"],
        ["4", "body", "Varchar(250)", "Not Null", "Push alert text body"],
        ["5", "channelId", "Varchar(50)", "Not Null", "Target Android notification channel"],
        ["6", "dataPayload", "Varchar(1000)", "Optional", "Key-value JSON payload for in-app navigation"],
        ["7", "isRead", "Boolean", "Not Null", "Flag indicating whether notification was viewed"],
        ["8", "timestamp", "Timestamp", "Not Null", "Server timestamp marking transmission"]
    ]
    add_styled_table(doc, tbl_headers, tbl_notif_rows, widths, "Table 4.26: User Push Notifications Schema (tbl_notifications)")

    # 27. tbl_notification_queue
    add_heading_2(doc, "27. tbl_notification_queue (notification_queue)")
    add_body_p(doc, "Primary key: queueId\nForeign key: Nil")
    tbl_nqueue_rows = [
        ["1", "queueId", "Varchar(36)", "Primary key, Not Null", "UUID identifying queued push alert"],
        ["2", "targetToken", "Varchar(256)", "Not Null", "FCM device registration token of recipient"],
        ["3", "title", "Varchar(100)", "Not Null", "Notification message title"],
        ["4", "body", "Varchar(250)", "Not Null", "Notification message body"],
        ["5", "actionUrl", "Varchar(250)", "Optional", "Deep-link route to open upon tap"],
        ["6", "status", "Enum('QUEUED','SENT','FAILED')", "Not Null", "Asynchronous dispatch delivery state"],
        ["7", "retryCount", "Int(2)", "Not Null", "Delivery retry counter (max 3)"],
        ["8", "createdAt", "Timestamp", "Not Null", "Queue entry creation timestamp"]
    ]
    add_styled_table(doc, tbl_headers, tbl_nqueue_rows, widths, "Table 4.27: Asynchronous Push Dispatch Queue Schema (tbl_notification_queue)")

    # 28. tbl_promotions
    add_heading_2(doc, "28. tbl_promotions (promotions)")
    add_body_p(doc, "Primary key: couponId\nForeign key: Nil")
    tbl_promo_rows = [
        ["1", "couponId", "Varchar(36)", "Primary key, Not Null", "UUID identifying promotional voucher"],
        ["2", "couponCode", "Varchar(20)", "Unique, Not Null", "Promotional discount code (e.g. WELCOME50)"],
        ["3", "discountPercentage", "Int(3)", "Not Null", "Percentage discount applied to order (1-100)"],
        ["4", "maxDiscountAmount", "Decimal(10,2)", "Not Null", "Ceiling cap on discount deduction in INR"],
        ["5", "minOrderAmount", "Decimal(10,2)", "Not Null", "Minimum booking subtotal required to qualify"],
        ["6", "validFrom", "Varchar(15)", "Not Null", "Commencement validity date (YYYY-MM-DD)"],
        ["7", "validUntil", "Varchar(15)", "Not Null", "Expiration validity date (YYYY-MM-DD)"],
        ["8", "isActive", "Boolean", "Not Null", "Coupon activation state flag"]
    ]
    add_styled_table(doc, tbl_headers, tbl_promo_rows, widths, "Table 4.28: Promotional Discount Vouchers Schema (tbl_promotions)")

    # 29. tbl_banners
    add_heading_2(doc, "29. tbl_banners (banners)")
    add_body_p(doc, "Primary key: bannerId\nForeign key: Nil")
    tbl_ban_rows = [
        ["1", "bannerId", "Varchar(36)", "Primary key, Not Null", "UUID identifying promotional banner"],
        ["2", "title", "Varchar(100)", "Not Null", "Banner title or seasonal campaign slogan"],
        ["3", "imageUrl", "Varchar(500)", "Not Null", "Cloud Storage URI for banner graphic asset"],
        ["4", "actionUrl", "Varchar(250)", "Optional", "In-app navigation destination route upon banner tap"],
        ["5", "targetRole", "Enum('customer','provider','all')", "Not Null", "Audience visibility filter"],
        ["6", "displayOrder", "Int(4)", "Not Null", "Carousel card sliding sequence position"],
        ["7", "isActive", "Boolean", "Not Null", "Banner publication status flag"],
        ["8", "createdAt", "Timestamp", "Not Null", "Creation timestamp"]
    ]
    add_styled_table(doc, tbl_headers, tbl_ban_rows, widths, "Table 4.29: In-App Promotional Banners Schema (tbl_banners)")

    # 30. tbl_platform_config
    add_heading_2(doc, "30. tbl_platform_config (platform_config)")
    add_body_p(doc, "Primary key: settingId\nForeign key: Nil")
    tbl_pconf_rows = [
        ["1", "settingId", "Varchar(32)", "Primary key, Not Null", "Unique identifier for platform configuration node"],
        ["2", "minAppVersion", "Int(4)", "Not Null", "Minimum mandatory APK versionCode required to operate"],
        ["3", "latestApkUrl", "Varchar(500)", "Optional", "Storage URI for latest release APK download"],
        ["4", "maintenanceModeEnabled", "Boolean", "Not Null", "Emergency system maintenance circuit breaker flag"],
        ["5", "maintenanceMessage", "Varchar(250)", "Optional", "User-facing downtime notification message"],
        ["6", "lastCheckedAt", "Timestamp", "Not Null", "Timestamp marking latest configuration synchronization"]
    ]
    add_styled_table(doc, tbl_headers, tbl_pconf_rows, widths, "Table 4.30: Platform Configuration & Release Controls Schema (tbl_platform_config)")

    # 31. tbl_geo_locations
    add_heading_2(doc, "31. tbl_geo_locations (locations / districts / cities)")
    add_body_p(doc, "Primary key: districtId\nForeign key: Nil")
    tbl_geo_rows = [
        ["1", "districtId", "Varchar(32)", "Primary key, Not Null", "Unique identifier for administrative district"],
        ["2", "districtName", "Varchar(50)", "Unique, Not Null", "Kerala district name (e.g. Kottayam, Ernakulam)"],
        ["3", "citiesCount", "Int(4)", "Not Null", "Total verified service coverage localities in district"],
        ["4", "stateName", "Varchar(50)", "Not Null", "State jurisdiction name ('Kerala')"],
        ["5", "isActive", "Boolean", "Not Null", "Territory service availability flag"]
    ]
    add_styled_table(doc, tbl_headers, tbl_geo_rows, widths, "Table 4.31: Geographic Regions & Coverage Zones Schema (tbl_geo_locations)")
