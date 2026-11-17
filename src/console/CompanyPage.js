import { useEffect, useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../auth';
import { API_URL } from '../shared';

export default function CompanyPage() {
  const { session } = useAuth();
  const auth = { headers: { Authorization: `Bearer ${session.token}` } };
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/admin/company`, auth)
      .then(r => setData(r.data))
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 2000);
    } catch (e) {
      setError('Could not copy. Select the text and copy it by hand.');
    }
  };

  const toggleSignup = async () => {
    setError('');
    try {
      const r = await axios.patch(`${API_URL}/admin/company`, { allowCustomerSignup: !data.allowCustomerSignup }, auth);
      setData({ ...data, allowCustomerSignup: r.data.allowCustomerSignup });
    } catch (e) {
      setError(e.response?.data?.error || 'Could not change the setting.');
    }
  };

  if (failed) return <div className="home"><h2 className="home-title">Company</h2><p className="error-message">Could not load the company details.</p></div>;
  if (!data) return <div className="home"><h2 className="home-title">Company</h2><p className="aside-note">Loading…</p></div>;

  const origin = window.location.origin;
  const chatLink = `${origin}/widget?org=${data.orgId}`;
  const signupLink = `${chatLink}&signup=1`;
  const snippet =
`<iframe src="${chatLink}" title="Chat assistant"
  style="position:fixed;bottom:20px;right:20px;width:380px;height:600px;max-height:calc(100vh - 40px);border:0;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.2);z-index:9999"></iframe>`;

  const box = { background: '#f4f6fb', border: '1px solid #dfe4ee', borderRadius: 8, padding: 10, fontSize: 13, wordBreak: 'break-all' };

  return (
    <div className="home">
      <h2 className="home-title">Company</h2>
      {error && <p className="error-message">{error}</p>}

      <section className="aside-card">
        <h3>Details</h3>
        <div className="kv-row"><span>Name</span><strong>{data.name}</strong></div>
        <div className="kv-row"><span>Company ID</span><strong>{data.orgId}</strong></div>
        <div className="kv-row"><span>Staff</span><strong>{data.staff}</strong></div>
        <div className="kv-row"><span>Customers</span><strong>{data.customers}</strong></div>
      </section>

      <section className="aside-card">
        <h3>Customer sign-up</h3>
        <p className="aside-note">
          Share this link or QR code with your customers. They create their own account for your company.
        </p>
        <div className="kv-row">
          <span>Customers can sign up</span>
          <button className="primary-btn" onClick={toggleSignup}>
            {data.allowCustomerSignup ? 'On: turn off' : 'Off: turn on'}
          </button>
        </div>
        {!data.allowCustomerSignup && (
          <p className="aside-note">Sign-up is closed. The link below shows "not available" until you turn it on.</p>
        )}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
          <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #dfe4ee' }}>
            <QRCodeSVG value={signupLink} size={132} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={box}>{signupLink}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button className="primary-btn" onClick={() => copy(signupLink, 'signup')}>
                {copied === 'signup' ? 'Copied' : 'Copy link'}
              </button>
              <a href={signupLink} target="_blank" rel="noreferrer"><button>Open</button></a>
            </div>
          </div>
        </div>
      </section>

      <section className="aside-card">
        <h3>Chat on your website</h3>
        <p className="aside-note">
          Paste this into your website's page, just before the closing &lt;/body&gt; tag.
          It shows the assistant as a chat box in the bottom-right corner.
        </p>
        <pre style={{ ...box, whiteSpace: 'pre-wrap', margin: 0 }}>{snippet}</pre>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button className="primary-btn" onClick={() => copy(snippet, 'snippet')}>
            {copied === 'snippet' ? 'Copied' : 'Copy code'}
          </button>
          <a href={chatLink} target="_blank" rel="noreferrer"><button>Preview chat</button></a>
        </div>
        <p className="aside-note" style={{ marginTop: 10 }}>
          This is the basic version. The full-screen button only works on your demo site for now.
        </p>
      </section>
    </div>
  );
}