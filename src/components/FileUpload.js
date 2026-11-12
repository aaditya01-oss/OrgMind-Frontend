import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../shared';


export function FileUpload({ token, isAdmin, onClose }) {
  const [file, setFile] = useState(null)
  const [uploadType, setUploadType] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [visibility, setVisibility] = useState('internal')
  const [department, setDepartment] = useState('')

  const handleUpload = async () => {
    if (!file || !uploadType) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
      if (uploadType === 'train') {
      formData.append('visibility', visibility)
      formData.append('department', department)
    }

    try {
      const endpoint = uploadType === 'train' ? '/documents/train' : '/documents/ocr'
      const response = await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setResult(response.data)
        } catch (err) {
      if (err.response?.status === 403) {
        setError('Only administrators can add documents to the knowledge base.')
        return
      }
      setError(err.response?.data?.error || err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-modal">
      <div className="upload-box">
        <div className="upload-header">
          <h3>Attach Document</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {!uploadType && (
          <div className="upload-options">
            <p>What would you like to do?</p>
              {isAdmin && (
              <button 
                className="upload-option-btn"
                onClick={() => setUploadType('train')}
              >
                📚 Train DocMind
                <span>Feed document to knowledge base</span>
              </button>
            )}
            <button 
              className="upload-option-btn"
              onClick={() => setUploadType('ocr')}
            >
              🔍 Scan Document
              <span>Extract text via OCR</span>
            </button>
          </div>
        )}

        {uploadType && !result && (
          <div className="upload-form">
            <p className="upload-type-label">
              {uploadType === 'train' ? '📚 Training DocMind' : '🔍 Scanning Document'}
            </p>
            <input
              type="file"
              accept={uploadType === 'train' ? '.pdf,.docx,.txt' : '.pdf,.png,.jpg,.jpeg'}
              onChange={(e) => setFile(e.target.files[0])}
              className="file-input"
            />
            {file && <p className="file-name">Selected: {file.name}</p>}
                        {uploadType === 'train' && (
              <div className="visibility-box">
                <label>Who can see this document?
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                    <option value="internal">Everyone in the organization</option>
                    <option value="public">Public (anyone, even without login)</option>
                    <option value="registered">Registered users and employees</option>
                    <option value="department">One department only</option>
                    <option value="admin_only">Admins only</option>
                  </select>
                </label>
                {visibility === 'department' && (
                  <label>Department name
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. hr" />
                  </label>
                )}
              </div>
            )}
            {error && <p className="error-message">{error}</p>}
            <div className="upload-actions">
              <button onClick={() => setUploadType(null)}>Back</button>
              <button 
                onClick={handleUpload} 
                disabled={!file || loading}
                className="primary-btn"
              >
                {loading ? 'Processing...' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="upload-result">
            <p className="success">✅ {result.message}</p>
            {result.extracted_text && (
              <div className="extracted-text">
                <p>Extracted Text:</p>
                <textarea 
                  readOnly 
                  value={result.extracted_text}
                  rows={8}
                />
              </div>
            )}
              {result.id_card && (
              <div className={`id-card-notice ${result.id_card.needs_review.length > 0 ? 'warn' : ''}`}>
                <p className="id-card-title">Student ID card detected</p>
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
            <button onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}