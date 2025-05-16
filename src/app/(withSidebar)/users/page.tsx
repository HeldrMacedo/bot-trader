"use client";
import { useEffect, useState } from "react";
import { User } from "@prisma/client";
import { deleteUser, getUsers, createUser, updateUser } from "./actions";
import UserModal from "./UserModal";
import { UserGroupIcon } from "@heroicons/react/24/outline";

export default function UsersPage() {
  const [data, setData] = useState<{
    users: User[];
    total: number;
    totalPages: number;
  }>({
    users: [],
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadUsers = async () => {
    const result = await getUsers(search, currentPage, itemsPerPage);
    setData(result);
  };

  useEffect(() => {
    loadUsers();
  }, [search, currentPage, itemsPerPage]);

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      await deleteUser(+id);
      loadUsers();
    }
  };

  const handleSubmit = async (
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ) => {
    if (editingUser) {
      await updateUser({ ...userData, id: editingUser.id });
    } else {
      await createUser(userData);
    }
    setIsModalOpen(false);
    setEditingUser(null);
    loadUsers();
  };

  return (
    <div className="p-6 bg-principal  mx-auto max-w-[1500px] rounded-lg shadow-md text-gray-400">
      
      <div className="p-6 max-w-7xl mx-auto">
      <h1 className="flex items-center gap-2 text-lg font-bold  mb-4">
        <UserGroupIcon className="w-6 h-6" /> Usuários
      </h1>
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <input
            type="text"
            placeholder="Buscar por nome..."
            className="w-full sm:max-w-xs p-2 border rounded-md bg-gray-800 border-gray-300 text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <div className="flex items-center gap-4 ">
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-2 rounded-md ounded-md border border-gray-300 bg-gray-800 text-base text-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm/6"
            >
              <option value={5}>5 itens</option>
              <option value={10}>10 itens</option>
              <option value={20}>20 itens</option>
              <option value={50}>50 itens</option>
            </select>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex w-full justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              Cadastrar Usuário
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-slate-500">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase">
                  Telefone
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-extrabold text-gray-400 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-slate-500">
              {data.users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">
                    {user.role === "admin" ? "Administrador" : "Usuário"}
                  </td>
                 
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(user.id.toString())}
                      className="text-red-600 hover:text-red-900"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded-md hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 border rounded-md ${
                  page === currentPage
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-gray-800"
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === data.totalPages}
            className="px-3 py-1 border rounded-md hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        </div>

        <UserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={handleSubmit}
          initialData={editingUser}
        />
      </div>
    </div>
  );
}
