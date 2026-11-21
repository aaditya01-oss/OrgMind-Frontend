import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';
import { VisibilityPicker } from './visibility';
import { useDepartmentNames } from './departmentPicker';
import './knowledge.css';

export function FileUpload({ token, isAdmin, onClose }) {
  const [file, setFile] = useState(null);
  const [uploadType, setUploadType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [visibility, setVisibility] = useState('internal');
  const [department, setDepartment] = useState('');
  const departments = useDepartmentNames(token, isAdmin);

  const training = uploadType === 'train';
  const missingDepartment = training && visibility === 'department' && !department.trim();

  const handleUpload = async () => {
    if (!file || !uploadType || missingDepartment) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (training) {
      formData.append('visibility', visibility);
      formData.append('department', department);
    }

    try {
      const endpoint = training ? '/documents/train' : '/documents/ocr';
      const response = await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResult(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Only administrators can add documents to the knowledge base.');
        return;
      }
      setError(err.response?.data?.error || err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setFile(null);
    setUploadType(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="kb-overlay">
      <div className="kb-dialog" role="dialog" aria-modal="true">
        <div className="kb-dialog-head">
          <h3>{!uploadType ? 'Add a document' : training ? 'Add to knowledge base' : 'Scan a document'}</h3>
          <button className="kb-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {!uploadType && (
          <div className="kb-choices">
            {isAdmin && (
              <button className="kb-choice" onClick={() => setUploadType('train')}>
                <strong>Add to knowledge base</strong>
                <span>The assistant learns from it and can answer questions about it. PDF, Word or text.</span>
              </button>
            )}
            <button className="kb-choice" onClick={() => setUploadType('ocr')}>
              <strong>Scan a document</strong>
              <span>Read the text out of a PDF or a photo (OCR).</span>
            </button>
          </div>
        )}

        {uploadType && !result && (
          <div>
            <label className="kb-field-label" style={{ marginTop: 0 }}>Choose a file</label>
            <input
              type="file"
              className="kb-file"
              accept={training ? '.pdf,.docx,.txt' : '.pdf,.png,.jpg,.jpeg'}
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {file && <p className="kb-picked">Selected: {file.name}</p>}

            {training && (
              <>
                <label className="kb-field-label">Who can see this document?</label>
                <VisibilityPicker
                  value={visibility}
                  onChange={setVisibility}
                  department={department}
                  onDepartment={setDepartment}
                  departments={departments}
                />
              </>
            )}

            {error && <p className="kb-banner bad" style={{ marginTop: 14 }}>{error}</p>}

            <div className="kb-actions">
              <button className="kb-btn" onClick={startOver}>Back</button>
              <button
                className="kb-btn kb-btn-primary"
                onClick={handleUpload}
                disabled={!file || loading || missingDepartment}
              >
                {loading ? 'Processing...' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div>
            <p className="kb-banner ok">{result.message}</p>
            {result.extracted_text && (
              <>
                <label className="kb-field-label" style={{ marginTop: 0 }}>Extracted text</label>
                <textarea className="kb-result-text" readOnly value={result.extracted_text} rows={8} />
              </>
            )}
            {result.id_card && (
              <div className={`kb-idcard ${result.id_card.needs_review.length > 0 ? 'warn' : ''}`}>
                <p><strong>Student ID card detected</strong></p>
                <p>
                  ID: <strong>{result.id_card.student_id || 'not readable'}</strong>
                  {result.id_card.student_id_status === 'corrected' &&
                    ' (a look-alike character was corrected, please verify)'}
                </p>
                <p>Name: <strong>{result.id_card.name || 'not readable'}</strong></p>
                <p>
                  Valid until: <strong>{result.id_card.valid_upto || 'not readable'}</strong>
                  {result.id_card.expired === true && ' (EXPIRED)'}
                </p>
                {result.id_card.needs_review.length > 0 && (
                  <p>Please check manually: {result.id_card.needs_review.join(', ')}</p>
                )}
              </div>
            )}
            <div className="kb-actions">
              <button className="kb-btn" onClick={startOver}>Add another</button>
              <button className="kb-btn kb-btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}