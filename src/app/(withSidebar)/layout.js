import Sidebar from "./components/SideBar";

export default function HomeLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar>
       {children}
      </Sidebar>
      {/* <div className="flex-1 p-2 bg-gray-100">{children}</div> */}
    </div>
  );
}
