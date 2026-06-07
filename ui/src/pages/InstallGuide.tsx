import { useState } from 'react';

// ── Sub-components ────────────────────────────────────────────────────────────

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div style={S.codeBlock}>
      <pre style={S.pre}>{children}</pre>
      <button onClick={copy} style={{ ...S.copyBtn, ...(copied ? S.copyBtnDone : {}) }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

// ── Step definitions — content is a render function to avoid TDZ ─────────────

type StepDef = { title: string; tag: string; content: () => React.ReactNode };

const STEPS: StepDef[] = [
  {
    title: 'Before you go — build the release package',
    tag: 'On your machine',
    content: () => (
      <div>
        <p style={S.bodyText}>Do this once per version on your development machine before visiting the client.</p>
        <CodeBlock>{`# 1. Make sure your keypair exists (run once ever)\nnode tools/keygen/generate-keypair.js\n# Paste the printed PUBLIC KEY into:\n#   nestjs-pos/src/modules/license/license.constants.ts\n\n# 2. Build the release zip\ncd nestjs-pos\nAPP_VERSION=1.0.0 bash deploy/local/build-release.sh\n\n# Output: nestjs-pos/release/PointSell-v1.0.0-local.zip\n# Copy this zip onto a USB drive`}</CodeBlock>
      </div>
    ),
  },
  {
    title: 'On the client machine — check prerequisites',
    tag: 'At client site',
    content: () => (
      <div>
        <p style={S.bodyText}>The client machine needs two things installed before setup:</p>
        <table style={S.miniTable}>
          <thead>
            <tr>
              <th style={S.miniTh}>Software</th>
              <th style={S.miniTh}>Version</th>
              <th style={S.miniTh}>Download</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.miniTd}>Node.js</td>
              <td style={S.miniTd}>20 LTS</td>
              <td style={S.miniTd}><code style={S.mono}>https://nodejs.org/en/download</code></td>
            </tr>
            <tr>
              <td style={S.miniTd}>PostgreSQL</td>
              <td style={S.miniTd}>15 or 16</td>
              <td style={S.miniTd}><code style={S.mono}>https://www.postgresql.org/download</code></td>
            </tr>
          </tbody>
        </table>
        <p style={{ ...S.bodyText, marginTop: 12 }}>
          <strong>Windows tip:</strong> During PostgreSQL install, note the password you set for the{' '}
          <code style={S.mono}>postgres</code> user — you will need it in the next step.
        </p>
      </div>
    ),
  },
  {
    title: 'Run setup — first time only',
    tag: 'At client site',
    content: () => (
      <div>
        <p style={S.bodyText}>
          Extract the zip from USB and run the setup script. It will create the database, run
          migrations, load sample data, and create a desktop shortcut.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={S.osBadge}>Windows</div>
            <CodeBlock>{`# Extract PointSell-v1.0.0-local.zip to C:\\PointSell\\\n# Then double-click:\nsetup.bat`}</CodeBlock>
          </div>
          <div>
            <div style={S.osBadge}>Linux / Mac</div>
            <CodeBlock>{`# Extract zip, then:\nbash setup.sh`}</CodeBlock>
          </div>
        </div>
        <p style={{ ...S.bodyText, marginTop: 14 }}>
          When prompted for business type, choose <strong>Pharmacy</strong>, <strong>Restaurant</strong>,
          or whichever applies. Default admin credentials will be shown at the end — write them down.
        </p>
      </div>
    ),
  },
  {
    title: 'Get the machine fingerprint',
    tag: 'At client site',
    content: () => (
      <div>
        <p style={S.bodyText}>
          The fingerprint uniquely identifies the client machine and binds the license to it.
          Run this in the PointSell folder on the client machine:
        </p>
        <CodeBlock>{`node tools/fingerprint/fingerprint.js --copy\n# Prints a 64-character hex hash and copies it to clipboard`}</CodeBlock>
        <p style={{ ...S.bodyText, marginTop: 12 }}>
          <strong>Copy the hash</strong> and paste it into the License Generator (★) below.
          You can also fetch it from the browser once the app is running:
        </p>
        <CodeBlock>{`GET http://localhost:3003/v1/license/fingerprint`}</CodeBlock>
      </div>
    ),
  },
  {
    title: 'Generate the license file',
    tag: 'On your machine',
    content: () => (
      <div>
        <p style={S.bodyText}>
          Use the <strong>License Generator (★)</strong> below. Select the tenant, paste the
          fingerprint, pick an expiry date, and copy the ready-to-run command. Run it on your
          machine where the private key lives:
        </p>
        <CodeBlock>{`# Example — use the generator below for the exact command\nnode tools/keygen/generate-license.js \\\n  --tenant-id   "uuid-of-this-client" \\\n  --business    "Al-Farooq Pharmacy" \\\n  --fingerprint "a3f9...hash" \\\n  --expires     "2027-06-07" \\\n  --mode        offline \\\n  --features    "pos,pharmacy" \\\n  --out         ./license.key`}</CodeBlock>
        <p style={{ ...S.bodyText, marginTop: 12 }}>
          This produces a <code style={S.mono}>license.key</code> file signed with your private key.
        </p>
      </div>
    ),
  },
  {
    title: 'Deliver the license and start',
    tag: 'At client site',
    content: () => (
      <div>
        <p style={S.bodyText}>
          Copy <code style={S.mono}>license.key</code> from your machine (via USB) into the PointSell
          root folder on the client machine — same folder as{' '}
          <code style={S.mono}>start.bat</code> / <code style={S.mono}>start.sh</code>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={S.osBadge}>Windows</div>
            <CodeBlock>{`# Double-click desktop shortcut, or:\nstart.bat`}</CodeBlock>
          </div>
          <div>
            <div style={S.osBadge}>Linux / Mac</div>
            <CodeBlock>{`bash start.sh`}</CodeBlock>
          </div>
        </div>
        <p style={{ ...S.bodyText, marginTop: 14 }}>
          The app reads <code style={S.mono}>license.key</code> automatically on startup — no
          activation step needed. Open <code style={S.mono}>http://localhost:3003</code> in the browser.
        </p>
      </div>
    ),
  },
  {
    title: 'First login and handover',
    tag: 'At client site',
    content: () => (
      <div>
        <table style={S.miniTable}>
          <tbody>
            <tr>
              <td style={{ ...S.miniTd, fontWeight: 600, width: 120 }}>URL</td>
              <td style={S.miniTd}><code style={S.mono}>http://localhost:3003</code></td>
            </tr>
            <tr>
              <td style={{ ...S.miniTd, fontWeight: 600 }}>Email</td>
              <td style={S.miniTd}><code style={S.mono}>admin@pointsell.app</code></td>
            </tr>
            <tr>
              <td style={{ ...S.miniTd, fontWeight: 600 }}>Password</td>
              <td style={S.miniTd}><code style={S.mono}>Admin@123</code></td>
            </tr>
          </tbody>
        </table>
        <div style={{ ...S.infoBox, marginTop: 14 }}>
          <strong>Before leaving:</strong> log in, go to Settings → Profile, and change the admin
          password. Also set the business name, address, and currency in Settings → Business.
        </div>
        <p style={{ ...S.bodyText, marginTop: 12 }}>
          <strong>LAN access (multiple terminals):</strong> If other computers in the shop need
          access, set <code style={S.mono}>ALLOWED_ORIGINS</code> in{' '}
          <code style={S.mono}>.env</code> to include their IPs, then open{' '}
          <code style={S.mono}>{'http://<server-LAN-ip>:3003'}</code> from those machines.
        </p>
      </div>
    ),
  },
];

// ── Feature config ────────────────────────────────────────────────────────────

const FEATURE_OPTIONS = [
  { key: 'pos',            label: 'POS (core)' },
  { key: 'pharmacy',       label: 'Pharmacy mode' },
  { key: 'restaurant',     label: 'Restaurant / Cafe mode' },
  { key: 'multi-register', label: 'Multi-register' },
];

// ── Main page ─────────────────────────────────────────────────────────────────

function newUuid() {
  return crypto.randomUUID();
}

export default function InstallGuidePage() {
  const [businessName, setBusinessName] = useState('');
  const [licenseId, setLicenseId]       = useState(newUuid);
  const [fingerprint, setFingerprint]   = useState('');
  const [expires, setExpires]           = useState(
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [features, setFeatures]         = useState<Record<string, boolean>>({ pos: true });
  const [copied, setCopied]             = useState(false);
  const [openStep, setOpenStep]         = useState<number | null>(null);

  const featureStr = FEATURE_OPTIONS
    .filter(f => features[f.key])
    .map(f => f.key)
    .join(',');

  const command = [
    `node tools/keygen/generate-license.js \\`,
    `  --tenant-id   "${licenseId}" \\`,
    `  --business    "${businessName || '<business name>'}" \\`,
    `  --fingerprint "${fingerprint || '<paste fingerprint from client machine>'}" \\`,
    `  --expires     "${expires}" \\`,
    `  --mode        offline \\`,
    `  --features    "${featureStr || 'pos'}" \\`,
    `  --out         ./license.key`,
  ].join('\n');

  function copyCommand() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleStep(n: number) {
    setOpenStep(prev => (prev === n ? null : n));
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={S.heading}>Installation Guide</h2>
        <p style={S.subtitle}>
          Step-by-step guide for installing PointSell on a client's computer (offline / air-gapped).
          Open this page on your laptop while at the client site.
        </p>
      </div>

      {/* Static steps */}
      {STEPS.map((step, i) => (
        <div key={i} style={S.stepCard}>
          <button style={S.stepHeader} onClick={() => toggleStep(i)}>
            <span style={S.stepNum}>{i + 1}</span>
            <span style={S.stepTitle}>{step.title}</span>
            <span style={S.stepTag}>{step.tag}</span>
            <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 18 }}>
              {openStep === i ? '▲' : '▼'}
            </span>
          </button>
          {openStep === i && <div style={S.stepBody}>{step.content()}</div>}
        </div>
      ))}

      {/* Dynamic license generator */}
      <div style={{ ...S.stepCard, borderColor: '#3b82f6', borderWidth: 2 }}>
        <button style={S.stepHeader} onClick={() => toggleStep(99)}>
          <span style={{ ...S.stepNum, background: '#3b82f6' }}>★</span>
          <span style={S.stepTitle}>License Generator</span>
          <span style={{ ...S.stepTag, background: '#eff6ff', color: '#2563eb' }}>Dynamic</span>
          <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 18 }}>
            {openStep === 99 ? '▲' : '▼'}
          </span>
        </button>

        {openStep === 99 && (
          <div style={S.stepBody}>
            <p style={S.bodyText}>
              Fill in the business details, paste the fingerprint from the client machine, and copy
              the ready-to-run command. Run it on your machine (where the private key lives).
            </p>

            <div style={S.genGrid}>
              <div>
                <label style={S.label}>Business Name</label>
                <input
                  style={S.input}
                  placeholder="Al-Farooq Pharmacy"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                />
              </div>

              <div>
                <label style={S.label}>License Expires</label>
                <input
                  style={S.input}
                  type="date"
                  value={expires}
                  onChange={e => setExpires(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={S.label}>License ID (auto-generated)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...S.input, fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}
                    value={licenseId}
                    readOnly
                  />
                  <button
                    onClick={() => setLicenseId(newUuid())}
                    style={{ padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    New ID
                  </button>
                </div>
                <span style={S.hint}>Unique identifier embedded in the license file for this installation.</span>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={S.label}>Machine Fingerprint</label>
                <input
                  style={S.input}
                  placeholder="Paste the hash from the client machine — see Step 4"
                  value={fingerprint}
                  onChange={e => setFingerprint(e.target.value.trim())}
                  spellCheck={false}
                />
                <span style={S.hint}>
                  Run <code style={S.mono}>node tools/fingerprint/fingerprint.js</code> on the
                  client machine and paste the hash here.
                </span>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={S.label}>Features</label>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 6 }}>
                  {FEATURE_OPTIONS.map(f => (
                    <label
                      key={f.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}
                    >
                      <input
                        type="checkbox"
                        checked={!!features[f.key]}
                        onChange={e => setFeatures(prev => ({ ...prev, [f.key]: e.target.checked }))}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={S.codeBlock}>
              <pre style={S.pre}>{command}</pre>
              <button
                onClick={copyCommand}
                style={{ ...S.copyBtn, ...(copied ? S.copyBtnDone : {}) }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div style={S.infoBox}>
              <strong>After running this command:</strong> a <code style={S.mono}>license.key</code>{' '}
              file is created in your current directory. Copy it to a USB drive and place it in the
              PointSell root folder on the client machine (same folder as{' '}
              <code style={S.mono}>start.bat</code>). Restart PointSell — it picks up the license
              automatically.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  heading:     { fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 },
  subtitle:    { fontSize: 14, color: '#64748b', marginTop: 6 },
  stepCard:    { background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12, border: '1px solid #e2e8f0', overflow: 'hidden' },
  stepHeader:  { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const },
  stepNum:     { minWidth: 28, height: 28, borderRadius: '50%', background: '#64748b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  stepTitle:   { fontSize: 15, fontWeight: 600, color: '#1e293b' },
  stepTag:     { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', letterSpacing: '0.03em' },
  stepBody:    { padding: '0 20px 20px' },
  bodyText:    { fontSize: 14, color: '#374151', margin: '0 0 10px', lineHeight: 1.6 },
  codeBlock:   { position: 'relative' as const, background: '#0f172a', borderRadius: 8, padding: '14px 52px 14px 16px', margin: '12px 0' },
  pre:         { margin: 0, color: '#e2e8f0', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre' as const, overflowX: 'auto' as const },
  copyBtn:     { position: 'absolute' as const, top: 10, right: 10, padding: '4px 10px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  copyBtnDone: { background: '#166834', color: '#bbf7d0' },
  infoBox:     { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1e40af', lineHeight: 1.6 },
  mono:        { fontFamily: 'monospace', fontSize: '0.9em', background: '#f1f5f9', padding: '1px 4px', borderRadius: 4 },
  label:       { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  hint:        { display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 4 },
  input:       { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  genGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  miniTable:   { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  miniTh:      { padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' as const, fontWeight: 600, color: '#64748b', fontSize: 12 },
  miniTd:      { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
  osBadge:     { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 6 },
};
