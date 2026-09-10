import api from "../api/axios";

export interface Customer {
  _id?: string;
  name: string;
  phone: string;
  city: string;
  balance: number;
}

// GET all customers
export const getCustomers = async () => {
  const response = await api.get<Customer[]>("/customers");
  return response.data;
};

// GET one customer
export const getCustomerById = async (id: string) => {
  const response = await api.get<Customer>(`/customers/${id}`);
  return response.data;
};

// CREATE customer
export const createCustomer = async (customer: Customer) => {
  const response = await api.post<Customer>("/customers", customer);
  return response.data;
};

// UPDATE customer
export const updateCustomer = async (
  id: string,
  customer: Customer
) => {
  const response = await api.put<Customer>(
    `/customers/${id}`,
    customer
  );
  return response.data;
};

// DELETE customer
export const deleteCustomer = async (id: string) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};