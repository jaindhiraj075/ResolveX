# ResolveX — Phase 4: AI Complaint Intelligence Layer Report

## 1. Executive Summary
Phase 4 of **ResolveX – AI-Powered Intelligent College Complaint Management System** has been successfully implemented. The application now features an operational Machine Learning and Natural Language Processing pipeline:
1. Student submits a grievance title and description.
2. The text is cleaned and preprocessed using domain-tuned tokenization and stopwords handling (`ComplaintPreprocessor`).
3. Real TF-IDF vectorization transforms the text into high-dimensional representations.
4. Trained Logistic Regression models predict the **Category** and **Priority**, generating genuine model probabilities (`predict_proba`) as confidence scores.
5. The **Department** is mapped with calibrated probability to the appropriate operational unit.
6. The grievance is compared against active campus tickets using **Cosine Similarity** (`DuplicateDetector`).
7. If similarity exceeds the configurable threshold (`DUPLICATE_THRESHOLD = 0.65`), the complaint is automatically flagged and closed as a duplicate (`CLOSED_AS_DUPLICATE`), linked to the original ticket, and recorded in `DuplicateComplaint`.
8. Both students and staff view the detailed **AI Analysis Card**. Authorized Staff and Administrators can perform a **Human Operational Override**, which updates the live classification while preserving original AI predictions in the database and logging an audit history record.

---

## 2. AI Architecture Implemented
```
backend/
  ai/
    config.py                     # Centralized paths, mappings, and thresholds
    preprocessing/
      text_cleaner.py             # ComplaintPreprocessor (normalizer, cleaner)
    classification/
      classifier.py               # ComplaintClassifier (TF-IDF + Logistic Regression)
      department_predictor.py     # DepartmentPredictor (category-to-dept mapping)
      priority_predictor.py       # PriorityPredictor (ML + severity calibration)
    duplicate_detection/
      detector.py                 # DuplicateDetector (TF-IDF + Cosine Similarity)
    models/
      vectorizer.pkl              # Fitted TF-IDF vectorizer artifact
      category_model.pkl          # Trained category classifier artifact
      priority_model.pkl          # Trained priority classifier artifact
      metrics.json                # Cross-validated evaluation report
    training/
      data/
        complaints.csv            # 100 labeled college grievance examples
      train_models.py             # Model training & Stratified K-Fold evaluation
    inference/
      ai_service.py               # AIService (unified orchestrator & safe fallback)
    __init__.py
```

---

## 3. Models Used & Training Dataset
- **Vectorizer:** `TfidfVectorizer` (sublinear TF scaling, n-gram range `(1, 2)`, unicode accent stripping, min_df=1, max_df=0.95).
- **Category Classifier:** `LogisticRegression` (multinomial formulation, L2 regularization `C=2.5`, max_iter=1000).
- **Priority Classifier:** `LogisticRegression` (L2 regularization `C=2.0`, max_iter=1000) with keyword severity calibration.
- **Dataset:** `backend/ai/training/data/complaints.csv` containing 100 diverse, realistic grievances categorized across:
  - `Wi-Fi & Internet` (Target: IT / Network)
  - `Hostel & Living` (Target: Hostel Administration)
  - `Campus Infrastructure` (Target: Campus Maintenance)
  - `Lab & Equipment` (Target: CSE Lab)

---

## 4. Actual Model Evaluation Metrics
Evaluated using 5-fold Stratified Cross-Validation (`backend/ai/training/train_models.py`):

| Model | Accuracy | Weighted Precision | Weighted Recall | Weighted F1-Score |
| :--- | :---: | :---: | :---: | :---: |
| **Category Classifier** | **70.00%** | **71.70%** | **70.00%** | **70.02%** |
| **Priority Classifier** | **43.00%** | **44.42%** | **43.00%** | **41.89%** |

*Note: For a 4-class multi-class problem where random guess is 25.0%, the Category Classifier achieves 70.0% accuracy across unseen validation folds. In later phases with larger datasets, Priority accuracy can be further expanded.*

---

## 5. Duplicate Detection & Threshold
- **Algorithm:** TF-IDF embedding + Cosine Similarity comparison against all active non-closed campus complaints.
- **Configurable Threshold:** `DUPLICATE_THRESHOLD = 0.65` in `backend/ai/config.py`.
- **Workflow:**
  - If similarity $\ge 0.65$: Complaint is assigned status `CLOSED_AS_DUPLICATE`.
  - A record is persisted in `duplicate_complaints` linking `original_complaint_id` and `duplicate_complaint_id` with `similarity_score`.
  - An audit history entry records "Closed as Duplicate" with the matched complaint ID and percentage.
  - The student is notified in-app with a direct link to the original complaint.

---

## 6. Staff & Admin Override System
- **Endpoint:** `POST /api/complaints/<id>/override`
- **Fields:** `category_id`, `department_id`, `priority`, and mandatory `reason`.
- **Integrity Guarantee:** The original AI predictions (`ai_category`, `ai_category_confidence`, `ai_department`, `ai_priority`) are permanently preserved. The new decisions are saved to `final_category`, `final_department`, and `final_priority` with `is_overridden = True`.
- **Audit Logging:** Logs a `ComplaintHistory` entry: "AI Recommendation Overridden" with user details and exact before/after transitions.

---

## 7. API Changes & Endpoints
- `POST /api/ai/analyze` — Dedicated endpoint returning category, department, priority, duplicate analysis, and confidence scores.
- `POST /api/complaints` — Integrated AI inference, duplicate evaluation, and confidence persistence during grievance submission.
- `POST /api/complaints/<id>/override` — Staff and Admin classification override.

---

## 8. Frontend Changes
- `src/components/ai/AIAnalysisCard.tsx`: SaaS-grade AI telemetry card displaying category, department, priority, confidence bars, duplicate link, low-confidence warning, and override controls.
- `src/pages/student/StudentSubmitComplaint.tsx`: Integrated real AI pipeline status and automatic duplicate detection feedback screen.
- `src/pages/student/StudentComplaintDetails.tsx`: Displays AI analysis card and duplicate link.
- `src/pages/staff/StaffComplaintDetails.tsx`: Displays AI analysis card with staff override capabilities.
- `src/pages/admin/AdminComplaintDetails.tsx`: Displays AI analysis card with administrator override capabilities.
- `src/services/complaintService.ts`: Added `analyzeComplaint` and `overrideAI` API client functions.

---

## 9. Verification & Automated Testing
1. **Unit & Workflow Suite (`backend/tests/test_phase4_ai.py`):**
   - NLP text preprocessing test: **PASS**
   - Direct `AIService.analyze()` test: **PASS**
   - `POST /api/ai/analyze` endpoint test: **PASS**
   - Complaint submission storing AI results & duplicate detection: **PASS**
   - Staff/Admin human override preserving original AI predictions: **PASS**
   - **Result:** `Ran 5 tests in 3.099s OK`

2. **Full Regression Suite (`backend/tests/`):**
   - `test_auth.py` + `test_phase2_auth.py` + `test_phase3_workflow.py` + `test_phase4_ai.py`
   - **Result:** `Ran 13 tests in 8.546s OK (0 failures, 0 errors)`

3. **Live Proxy API Verification (Port 3000):**
   - `POST /api/ai/analyze`: **200 OK**
   - `POST /api/complaints` (New Issue): **201 Created (status PENDING, AI stored)**
   - `POST /api/complaints` (Duplicate Issue): **201 Created (status CLOSED_AS_DUPLICATE, 100% similarity)**
   - `POST /api/complaints/<id>/override`: **200 OK (AI preserved, final fields updated)**

4. **Applet Compilation & Linting:**
   - `compile_applet`: `Build succeeded - the applet is compiled`
   - `lint_applet`: `Linting completed successfully (0 errors)`

---

## 10. Remaining Limitations
- Initial dataset size is 100 examples; further accuracy expansion can be trained as institutional data accumulates in production.
- Model retraining is isolated to `train_models.py` (not executed on live API requests, ensuring fast response times).
