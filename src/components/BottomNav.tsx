import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: "home", label: "Home" },
  { path: "/analytics", icon: "bar_chart", label: "Analytics" },
  { path: "__add__", icon: "add", label: "Add" },
  { path: "/accounts", icon: "account_balance", label: "Accounts" },
  { path: "/profile", icon: "person", label: "Profile" },
];

interface BottomNavProps {
  onAddClick: () => void;
}

const BottomNav = ({ onAddClick }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 left-0 w-full z-50 px-6">
      <nav className="glass-panel mx-auto max-w-xs h-16 rounded-xl flex items-center justify-between px-6 shadow-2xl">
        {tabs.map((tab) => {
          if (tab.path === "__add__") {
            return (
              <button
                key="add"
                onClick={onAddClick}
                className="relative -top-6 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-neon border-4 border-background group hover:scale-105 transition-transform"
              >
                <span className="material-icons text-primary-foreground text-3xl group-hover:rotate-90 transition-transform duration-300">
                  add
                </span>
              </button>
            );
          }

          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-10 h-10 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`material-icons text-2xl ${isActive ? "drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" : ""}`}>
                {tab.icon}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
