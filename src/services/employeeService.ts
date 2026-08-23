import { apiRequest } from "./api";
import type { Employee, EmployeeFormInput } from "../types/employee";
import type { UserRole } from "../types/user";

interface ApiEmployee {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  department: { id: number; name: string } | null;
  designation: { id: number; name: string } | null;
  role: UserRole | null;
  has_user_account: boolean;
  joining_date: string | null;
  status: Employee["status"];
  is_manager: boolean;
}

interface EmployeeListResponse {
  employees: ApiEmployee[];
}

interface EmployeeResponse {
  message: string;
  employee: ApiEmployee;
}

interface MyProfileResponse {
  employee: ApiEmployee | null;
}

export interface MyProfileInput {
  name: string;
  email: string;
  phone: string;
  avatarFile: File | null;
}

const toEmployee = (data: ApiEmployee): Employee => ({
  id: String(data.id),
  name: data.full_name,
  email: data.email,
  phone: data.phone ?? "",
  avatar: data.avatar,
  department: data.department?.name ?? "",
  departmentId: data.department?.id ?? null,
  designation: data.designation?.name ?? "",
  designationId: data.designation?.id ?? null,
  role: data.role ?? "employee",
  joinDate: data.joining_date ?? "",
  status: data.status,
  isManager: data.is_manager,
  hasUserAccount: data.has_user_account,
});

const toFormData = (input: EmployeeFormInput): FormData => {
  const formData = new FormData();
  formData.append("full_name", input.name);
  formData.append("email", input.email);
  if (input.phone) formData.append("phone", input.phone);
  if (input.departmentId !== null)
    formData.append("department_id", String(input.departmentId));
  if (input.designationId !== null)
    formData.append("designation_id", String(input.designationId));
  formData.append("role", input.role);
  if (input.joinDate) formData.append("joining_date", input.joinDate);
  formData.append("status", input.status);
  if (input.avatarFile) formData.append("avatar", input.avatarFile);
  if (input.isManager !== undefined)
    formData.append("is_manager", input.isManager ? "1" : "0");
  return formData;
};

export const getEmployees = async (filters?: {
  unlinked?: boolean;
  isManager?: boolean;
}): Promise<Employee[]> => {
  const params = new URLSearchParams();
  if (filters?.unlinked) params.set("unlinked", "1");
  if (filters?.isManager !== undefined)
    params.set("is_manager", filters.isManager ? "1" : "0");

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiRequest<EmployeeListResponse>(`/employees${query}`);
  return data.employees.map(toEmployee);
};

export const createEmployee = async (
  input: EmployeeFormInput,
): Promise<Employee> => {
  const data = await apiRequest<EmployeeResponse>("/employees", {
    method: "POST",
    body: toFormData(input),
  });

  return toEmployee(data.employee);
};

export const updateEmployee = async (
  id: string,
  input: EmployeeFormInput,
): Promise<Employee> => {
  const formData = toFormData(input);
  // Laravel doesn't parse multipart bodies on real PUT requests, so spoof
  // the method via POST + `_method` (browsers can't send PUT+multipart).
  formData.append("_method", "PUT");

  const data = await apiRequest<EmployeeResponse>(`/employees/${id}`, {
    method: "POST",
    body: formData,
  });

  return toEmployee(data.employee);
};

export const deleteEmployee = (id: string): Promise<void> =>
  apiRequest(`/employees/${id}`, { method: "DELETE" });

export const getMyProfile = async (): Promise<Employee | null> => {
  const data = await apiRequest<MyProfileResponse>("/profile");
  return data.employee ? toEmployee(data.employee) : null;
};

export const updateMyProfile = async (input: MyProfileInput): Promise<Employee> => {
  const formData = new FormData();
  formData.append("full_name", input.name);
  formData.append("email", input.email);
  if (input.phone) formData.append("phone", input.phone);
  if (input.avatarFile) formData.append("avatar", input.avatarFile);

  const data = await apiRequest<EmployeeResponse>("/profile", {
    method: "POST",
    body: formData,
  });

  return toEmployee(data.employee);
};
