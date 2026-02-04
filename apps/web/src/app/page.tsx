export default function Page() {
  return (
    <div>
      <h2 className="section-title">MVP Modules</h2>
      <div className="grid">
        <div className="card">
          <h2>Auth & Eligibility</h2>
          <p>Email login, eligibility checks, and hashed student identity.</p>
        </div>
        <div className="card">
          <h2>Voting</h2>
          <p>One person, one vote. Convex validates, Algorand records.</p>
        </div>
        <div className="card">
          <h2>Automation</h2>
          <p>On-chain close + finalize with realtime UI updates.</p>
        </div>
        <div className="card">
          <h2>Certificates</h2>
          <p>Hash stored on-chain with public verification by tx id.</p>
        </div>
      </div>
    </div>
  );
}
