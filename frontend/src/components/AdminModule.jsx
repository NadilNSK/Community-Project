import React, { useState, useEffect } from 'react';
import { Users, Building2, Truck, PlusCircle, Shield } from 'lucide-react';
import { apiRequest } from '../api/client';

export default function AdminModule({ branches, vehicles, onMasterDataUpdated }) {
  const [users, setUsers] = useState([]);
  const [newBranch, setNewBranch] = useState({
    branchCode: '',
    branchName: '',
    branchType: 'SEWING',
    locationAddress: '',
  });
  const [newVehicle, setNewVehicle] = useState({
    registrationNo: '',
    driverName: '',
    driverNic: '',
    driverPhone: '',
    vehicleType: 'Covered Container Lorry (16ft)',
    assignedBranchId: '',
  });
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    fullName: '',
    password: 'password123',
    role: 'DISPATCH_OFFICER',
    assignedBranchId: branches[0]?.id || '',
  });
  const [statusMsg, setStatusMsg] = useState('');

  const loadUsers = async () => {
    try {
      const data = await apiRequest('/api/auth/users');
      setUsers(data);
    } catch {
      // Non-admin roles may not have access to /api/auth/users
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/auth/branches', {
        method: 'POST',
        body: JSON.stringify(newBranch),
      });
      setNewBranch({ branchCode: '', branchName: '', branchType: 'SEWING', locationAddress: '' });
      setStatusMsg('New factory branch created successfully.');
      onMasterDataUpdated();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicle.assignedBranchId) {
      setStatusMsg('Error: Please select an assigned home branch / base yard for this vehicle.');
      return;
    }
    try {
      await apiRequest('/api/auth/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          ...newVehicle,
          plateNumber: newVehicle.registrationNo,
          currentBranchId: newVehicle.assignedBranchId,
        }),
      });
      setNewVehicle({
        registrationNo: '',
        driverName: '',
        driverNic: '',
        driverPhone: '',
        vehicleType: 'Covered Container Lorry (16ft)',
        assignedBranchId: '',
      });
      setStatusMsg('New fleet vehicle & driver registered successfully to base yard.');
      onMasterDataUpdated();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          ...newUser,
          assignedBranchId: newUser.assignedBranchId || branches[0]?.id,
        }),
      });
      setNewUser({
        username: '',
        email: '',
        fullName: '',
        password: 'password123',
        role: 'DISPATCH_OFFICER',
        assignedBranchId: branches[0]?.id || '',
      });
      setStatusMsg('User provisioned with bcrypt hashed password & RBAC role.');
      loadUsers();
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-xl font-bold text-white">
          System Administration & Master Data
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage operator accounts, plant locations, and transport fleet vehicles
        </p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-200 text-sm font-medium">
          {statusMsg}
        </div>
      )}

      {/* Three Creation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. User Provisioning Form */}
        <form
          onSubmit={handleCreateUser}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5"
        >
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Provision RBAC User Account
          </h3>
          <input
            type="text"
            required
            placeholder="Full Name (e.g., Nimal Perera)"
            value={newUser.fullName}
            onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>
          <input
            type="email"
            required
            placeholder="Official Email Address"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          >
            <option value="DISPATCH_OFFICER">DISPATCH_OFFICER</option>
            <option value="GATE_SECURITY">GATE_SECURITY</option>
            <option value="RECEIVING_OFFICER">RECEIVING_OFFICER</option>
            <option value="LOGISTICS_MANAGER">LOGISTICS_MANAGER</option>
            <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
          </select>
          <select
            value={newUser.assignedBranchId}
            onChange={(e) => setNewUser({ ...newUser, assignedBranchId: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branchName}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            + Create User Account
          </button>
        </form>

        {/* 2. Plant Branch Registration */}
        <form
          onSubmit={handleCreateBranch}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5"
        >
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Register Factory Plant / Subcontractor
          </h3>
          <input
            type="text"
            required
            placeholder="Branch Code (e.g., TR-FIN-05)"
            value={newBranch.branchCode}
            onChange={(e) => setNewBranch({ ...newBranch, branchCode: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          />
          <input
            type="text"
            required
            placeholder="Branch Name (e.g., Trendy Koggala Plant)"
            value={newBranch.branchName}
            onChange={(e) => setNewBranch({ ...newBranch, branchName: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          />
          <select
            value={newBranch.branchType}
            onChange={(e) => setNewBranch({ ...newBranch, branchType: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          >
            <option value="SEWING">SEWING</option>
            <option value="WASHING">WASHING</option>
            <option value="FINISHING">FINISHING</option>
            <option value="EMBROIDERY">EMBROIDERY</option>
            <option value="SUBCONTRACTOR">SUBCONTRACTOR</option>
            <option value="HEAD_OFFICE">HEAD_OFFICE</option>
          </select>
          <input
            type="text"
            required
            placeholder="Location Address"
            value={newBranch.locationAddress}
            onChange={(e) => setNewBranch({ ...newBranch, locationAddress: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            + Add Factory Branch
          </button>
        </form>

        {/* 3. Vehicle & Driver Registration */}
        <form
          onSubmit={handleCreateVehicle}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5"
        >
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            Register Transport Vehicle
          </h3>
          <input
            type="text"
            required
            placeholder="Vehicle Reg No / Plate Number (e.g., WP NC-7721)"
            value={newVehicle.registrationNo}
            onChange={(e) => setNewVehicle({ ...newVehicle, registrationNo: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            placeholder="Vehicle Type (e.g., 16ft Container Lorry)"
            value={newVehicle.vehicleType}
            onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              ASSIGNED HOME BRANCH / BASE YARD *
            </label>
            <select
              required
              value={newVehicle.assignedBranchId}
              onChange={(e) => setNewVehicle({ ...newVehicle, assignedBranchId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="" disabled>Select Base Plant Yard</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.branchName} ({b.branchType})
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            required
            placeholder="Driver Full Name"
            value={newVehicle.driverName}
            onChange={(e) => setNewVehicle({ ...newVehicle, driverName: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Driver NIC"
              value={newVehicle.driverNic}
              onChange={(e) => setNewVehicle({ ...newVehicle, driverNic: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <input
              type="text"
              required
              placeholder="Driver Mobile / Phone"
              value={newVehicle.driverPhone}
              onChange={(e) => setNewVehicle({ ...newVehicle, driverPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            + Add Vehicle to Fleet
          </button>
        </form>
      </div>

      {/* Registered Fleet Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-base font-bold text-white mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            Registered Fleet Vehicles & Home Base Yards ({vehicles?.length || 0})
          </span>
          <span className="text-xs text-slate-400 font-normal">Active Transporters in Fleet</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles && vehicles.map((v) => {
            const branchName =
              v.currentBranch?.branchName ||
              branches.find((b) => b.id === v.currentBranchId)?.branchName ||
              'Adhikarigama Sewing Plant';
            const statusLabel = v.status === 'IN_YARD' || !v.status ? 'In Yard' : v.status;
            const regNo = v.registrationNo || v.registrationNumber || 'VEHICLE';
            return (
              <div
                key={v.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Lorry:</span>
                    <h4 className="text-base font-bold text-white tracking-wide font-mono">{regNo}</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {v.vehicleType || '16ft Container Lorry'}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-slate-300">
                    <span className="text-slate-400 font-medium">Details:</span> Driver: {v.driverName} • {v.driverPhone}
                  </p>
                  <p className="text-sky-300 font-semibold flex items-center gap-1">
                    <span>Base:</span> 📍 {branchName} ({statusLabel})
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Users & RBAC Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          Provisioned Users & Role-Based Access Control Matrix (Group 14)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Full Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">RBAC Role</th>
                <th className="py-2.5 px-3">Assigned Plant Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{u.username}</td>
                  <td className="py-2.5 px-3 font-medium text-white">{u.fullName}</td>
                  <td className="py-2.5 px-3 text-slate-400">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {u.assignedBranch?.branchName} ({u.assignedBranch?.branchType})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
