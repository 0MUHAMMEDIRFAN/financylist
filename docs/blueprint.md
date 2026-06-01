# **App Name**: Financylist

## Core Features:

- Customer Management: Allow users to add new customers with names and optional mobile numbers. Display a list of all customers, showing their current balance for quick overview.
- Transaction Recording: Provide 'You gave' and 'You got' buttons to initiate adding new payment entries. For each entry, capture amount, description, tag, and an 'is refund' flag.
- Refund Linking: If 'is refund' is selected for a transaction, enable an option to link this refund to a specific previous payment entry.
- Customer Transaction History: Upon selecting a customer, display all their payment entries in a date-wise ordered list. Each entry should clearly indicate whether it was 'gave' or 'got'.
- Entry Management: Enable the editing of existing transaction entries and a soft-delete mechanism to mark entries as inactive without permanent removal.
- Dynamic Balance Display: Automatically calculate and update each customer's balance based on their transactions. The balance will be displayed prominently on the customer list and detail view.
- Payment Description Assistant: Utilize an AI tool to suggest descriptions or tags for new payment entries based on the amount or past similar transactions.

## Style Guidelines:

- Background color: A very light, muted grey-purple (#F5F4F7) to create a clean and subtle base that doesn't distract from financial data.
- Primary accent color: A professional and trustworthy medium-deep indigo (#6953AC) to highlight key actions and branding elements without being overly bright.
- Secondary accent color: A clear, vibrant blue (#4D73EA) for interactive elements and call-to-actions, providing contrast with the primary accent.
- Positive balance/received indicator: A strong green (#39A739) to signify funds received or a positive financial state.
- Negative balance/given indicator: A distinct red (#B32F2F) to signify funds given or a negative financial state.
- Headline and body font: 'Inter' (sans-serif) for its modern, legible, and neutral aesthetic, ensuring clear readability for financial data and descriptions across all screen sizes.
- Utilize simple, clean, and modern line icons for actions like add, edit, delete, and link refunds to maintain a professional and intuitive user experience. Use arrows or clear symbols to denote money in vs. money out.
- Implement a responsive design that adapts seamlessly from mobile to desktop. Organize content with clear card-like structures for customer listings and transaction entries, prioritizing essential information at a glance. Emphasize accessible 'You gave' and 'You got' buttons on the payment entry screen.
- Incorporate subtle, quick animations for state changes, such as opening/closing forms, soft-deleting entries, and balance updates, to provide visual feedback without creating delays.
- Implement a light and dark theme appearance, referencing the overall UI design and aesthetic of https://elachi-accounting-software-v1.web.app/ for inspiration.