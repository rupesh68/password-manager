import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";

export default function App() {
  const [service, setService] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [vault, setVault] = useState([]);
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Load vault from Capacitor Preferences on startup
  useEffect(() => {
    let isMounted = true;

    async function loadVault() {
      const { value } = await Preferences.get({ key: "user_vault" });
      if (isMounted && value) {
        try {
          setVault(JSON.parse(value));
        } catch (e) {
          console.error("Failed to parse vault data:", e);
        }
      }
    }

    loadVault();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveVaultToDevice = async (updatedVault) => {
    setVault(updatedVault);
    await Preferences.set({
      key: "user_vault",
      value: JSON.stringify(updatedVault),
    });
  };

  const handleAddPassword = async (e) => {
    e.preventDefault();
    if (!service.trim() || !password.trim()) return;

    const newItem = {
      id: Date.now(),
      service: service.trim(),
      username: username.trim() || "-",
      password: password.trim(),
      createdAt: new Date().toLocaleDateString(),
    };

    const updated = [newItem, ...vault];
    await saveVaultToDevice(updated);
    setService("");
    setUsername("");
    setPassword("");
  };

  const handleDelete = async (id) => {
    const updated = vault.filter((item) => item.id !== id);
    await saveVaultToDevice(updated);
  };

  const toggleVisibility = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy password with web & native fallback
  const handleCopyPassword = async (id, pwd) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(pwd);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = pwd;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  };

  const handleDownloadCSV = () => {
    if (vault.length === 0) {
      alert("No passwords to export!");
      return;
    }

    let csvContent = "Service,Username,Password,Date Added\n";
    vault.forEach((item) => {
      const escapedService = `"${item.service.replace(/"/g, '""')}"`;
      const escapedUsername = `"${(item.username || "").replace(/"/g, '""')}"`;
      const escapedPassword = `"${item.password.replace(/"/g, '""')}"`;
      csvContent += `${escapedService},${escapedUsername},${escapedPassword},${item.createdAt}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `passwords_backup_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pt-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              🔐 Password Manager
            </h1>
            
          </div>
          <button
            onClick={handleDownloadCSV}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleAddPassword}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4 shadow-sm"
        >
          <h2 className="text-sm font-bold text-slate-800">
            Add New Account
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Service Name
            </label>
            <input
              type="text"
              placeholder="e.g. Instagram, Netflix"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 placeholder-slate-400 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Username / Email
            </label>
            <input
              type="text"
              placeholder="e.g. @username or email@domain.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 placeholder-slate-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 placeholder-slate-400 transition"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer"
          >
            Save Account
          </button>
        </form>

        {/* Stored Accounts List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Stored Accounts ({vault.length})
            </h2>
          </div>

          {vault.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-sm font-medium text-slate-400">
                No accounts saved yet.
              </p>
            </div>
          ) : (
            vault.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 flex justify-between items-center shadow-sm hover:shadow transition-shadow"
              >
                <div className="space-y-0.5 max-w-[50%]">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {item.service}
                  </p>
                  {item.username && item.username !== "-" && (
                    <p className="text-xs text-slate-500 truncate font-medium">
                      {item.username}
                    </p>
                  )}
                  <p className="text-xs font-mono text-emerald-700 font-semibold pt-0.5">
                    {showPasswords[item.id] ? item.password : "••••••••••••"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyPassword(item.id, item.password)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      copiedId === item.id
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {copiedId === item.id ? "✓ Copied" : "Copy"}
                  </button>

                  <button
                    onClick={() => toggleVisibility(item.id)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition cursor-pointer"
                  >
                    {showPasswords[item.id] ? "Hide" : "Show"}
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}