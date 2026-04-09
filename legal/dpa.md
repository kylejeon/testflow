# Data Processing Agreement (DPA)

> ⚠️ **Draft v1 — pending legal review. Do not publish without attorney approval.**  
> This template follows GDPR Article 28 requirements. Adjust to your jurisdiction before use.

**Version:** 1.0  
**Last Updated:** 2026-04-09

---

## Preamble

This Data Processing Agreement ("DPA") is entered into between:

**Data Controller:** The customer organization that has agreed to Testably's Terms of Service ("Customer" or "Controller")

**Data Processor:** {{company_legal_name}}, operator of Testably ("Testably" or "Processor")

This DPA forms part of, and is incorporated into, the Terms of Service between Controller and Processor. In case of conflict, this DPA prevails over the Terms of Service with respect to data protection obligations.

---

## 1. Definitions

- **"GDPR"** means the EU General Data Protection Regulation 2016/679
- **"Personal Data"** has the meaning given in Article 4(1) GDPR
- **"Processing"** has the meaning given in Article 4(2) GDPR
- **"Data Subject"** means the individuals whose Personal Data is processed
- **"Sub-processor"** means any third party engaged by Processor to process Personal Data on behalf of Controller
- **"Supervisory Authority"** means the competent data protection authority

---

## 2. Subject Matter and Duration

### 2.1 Subject Matter
Processor shall process Personal Data on behalf of Controller in connection with the provision of the Testably QA test case management Service as described in the Terms of Service.

### 2.2 Duration
This DPA remains in effect for the duration of the Terms of Service and for the period required for deletion/return of Personal Data after termination.

---

## 3. Nature and Purpose of Processing

| Parameter | Details |
|---|---|
| **Nature** | Storage, retrieval, display, organization, and analytics of QA test data |
| **Purpose** | Providing the Testably SaaS platform features to Controller's authorized users |
| **Categories of Personal Data** | Names, email addresses, profile information, usage logs, content created by users (test cases, results, comments) |
| **Categories of Data Subjects** | Controller's employees, contractors, and team members who use the Service |
| **Retention** | Per Processor's Privacy Policy; data deleted within 30 days of account termination |

---

## 4. Processor Obligations

### 4.1 Instructions
Processor shall process Personal Data only on documented instructions from Controller (as set forth in this DPA and the Terms of Service) unless required to do so by applicable law, in which case Processor shall inform Controller before processing, unless prohibited by law.

### 4.2 Confidentiality
Processor shall ensure that persons authorized to process the Personal Data have committed to confidentiality or are under appropriate statutory obligations.

### 4.3 Security
Processor shall implement and maintain appropriate technical and organizational security measures (Article 32 GDPR) including:

- **Encryption in transit:** TLS 1.2 or higher for all data transmitted
- **Encryption at rest:** AES-256 for stored data
- **Access control:** Role-based access, least-privilege principles, multi-factor authentication for administrator access
- **Data isolation:** Row-Level Security (RLS) in the database to isolate organizational data
- **Availability:** Hosted on Supabase/Vercel infrastructure with redundancy measures
- **Testing:** Regular assessment of security measures

### 4.4 Sub-processors
Processor has engaged the sub-processors listed in Schedule A. Processor shall:
- Impose data protection obligations on sub-processors equivalent to those in this DPA
- Remain fully liable to Controller for the performance of sub-processors
- Notify Controller of any intended changes to sub-processors with at least **30 days' notice**, giving Controller the opportunity to object

### 4.5 Data Subject Rights
Processor shall assist Controller in responding to Data Subject rights requests (access, rectification, erasure, restriction, portability, objection) by providing the data and tools available within the Service, and promptly forwarding any requests received directly from Data Subjects to Controller.

### 4.6 Data Protection Impact Assessments
Processor shall assist Controller, upon request, in carrying out data protection impact assessments (DPIA) and prior consultation with supervisory authorities where required.

### 4.7 Return and Deletion of Data
Upon termination of this DPA, Processor shall, at Controller's choice:
- Return all Personal Data to Controller in a standard machine-readable format (JSON/CSV), or
- Delete all Personal Data within **30 days** of termination

Processor shall certify deletion in writing upon request.

### 4.8 Audit Rights
Processor shall make available all information necessary to demonstrate compliance and shall allow for and contribute to audits conducted by Controller or an auditor mandated by Controller, upon reasonable notice and at Controller's expense.

---

## 5. Controller Obligations

Controller represents and warrants that:
- It has the legal right and authority to disclose Personal Data to Processor
- It has provided all required notices and obtained all required consents from Data Subjects
- Its instructions to Processor comply with applicable law

---

## 6. Personal Data Breaches

Processor shall:
- Notify Controller of any Personal Data breach **without undue delay and no later than 72 hours** after becoming aware of it
- Provide information about: (i) nature of the breach, (ii) categories and approximate numbers of Data Subjects and records affected, (iii) likely consequences, (iv) measures taken or proposed
- Cooperate with Controller in any required notification to Supervisory Authorities and Data Subjects

Breach notifications shall be sent to: the email address associated with the Controller's administrator account.

---

## 7. International Data Transfers

If Personal Data is transferred outside the EU/EEA, Processor shall ensure adequate safeguards as required by Chapter V GDPR, including:
- **Standard Contractual Clauses (SCCs)** as adopted by the European Commission
- Adequacy decisions where applicable

See Schedule A for the locations of sub-processors and applicable transfer mechanisms.

---

## 8. Governing Law

This DPA shall be governed by the laws of {{jurisdiction}}.

---

## Schedule A — Approved Sub-processors

| Sub-processor | Role | Data Processed | Location | Transfer Mechanism |
|---|---|---|---|---|
| **Supabase, Inc.** | Database, auth, storage, Edge Functions | All user & content data | EU (AWS eu-central-1) | SCCs |
| **Vercel, Inc.** | Frontend hosting, CDN | HTTP logs, edge data | US / Global | SCCs |
| **Paddle.com Market Ltd** | Payment processing | Billing & subscription data | UK / Global | UK Adequacy + SCCs |
| **Loops, Inc.** | Transactional & marketing email | Email address, name | US | SCCs |
| **Anthropic, PBC** | AI test case generation (Claude API) | User-provided input text | US | SCCs |
| **Functional Software, Inc. (Sentry)** | Error monitoring *(planned)* | Error logs, stack traces | US | SCCs |
| **PostHog, Inc.** | Product analytics *(planned)* | Usage events, anonymized IDs | EU (self-hosted option available) | SCCs / Adequacy |

*Controller may object to the addition of new sub-processors within 14 days of notice. If Controller objects and Processor cannot accommodate the objection, Controller may terminate the Terms of Service with a pro-rated refund.*

---

## Schedule B — Technical and Organizational Measures (TOMs)

### Confidentiality
- Encryption at rest (AES-256) and in transit (TLS 1.2+)
- Database-level row isolation (Supabase RLS)
- Access limited to authorized personnel on need-to-know basis
- Employee confidentiality agreements

### Integrity
- Input validation and output encoding
- Database transaction integrity
- Audit logging for administrative operations

### Availability
- Hosted on cloud infrastructure with high-availability guarantees (Supabase/Vercel)
- Regular automated backups by Supabase

### Resilience
- Cloud provider redundancy across availability zones
- Incident response procedures

### Testing and Evaluation
- Periodic security reviews
- Vulnerability assessment of dependencies (automated tooling)

---

## Schedule C — Contact Details

**Processor Data Protection Contact:**  
{{dpo_email}}

**For breach notifications:**  
{{support_email}} (use subject: "Security Incident")

---

*Last updated: 2026-04-09*
