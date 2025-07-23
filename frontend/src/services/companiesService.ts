// Companies Service
// Handles company API calls and data management
import { API_ENDPOINTS } from '../config/api';

export interface Company {
  companyId: string;
  companyName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  settings: {
    timezone: string;
    currency: string;
    businessType: string;
  };
  memberCount: number;
  status: 'active' | 'inactive';
}

export interface CreateCompanyRequest {
  companyName: string;
  createdBy: string;
}

export interface SearchCompaniesResponse {
  operation: string;
  companies: Company[];
  count: number;
}

export interface CompanyResponse {
  operation: string;
  company: Company;
}

class CompaniesService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_ENDPOINTS.COMPANIES_CRUD;
  }

  async createCompany(companyData: CreateCompanyRequest): Promise<Company> {
    const response = await fetch(`${this.baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'createCompany',
        ...companyData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to create company: ${response.status}`);
    }

    const result: CompanyResponse = await response.json();
    return result.company;
  }

  async getCompany(companyId: string): Promise<Company> {
    const response = await fetch(`${this.baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'getCompany',
        companyId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to get company: ${response.status}`);
    }

    const result: CompanyResponse = await response.json();
    return result.company;
  }

  async searchCompanies(searchTerm: string, limit: number = 10): Promise<Company[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    const response = await fetch(`${this.baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'searchCompanies',
        searchTerm: searchTerm.trim(),
        limit,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to search companies: ${response.status}`);
    }

    const result: SearchCompaniesResponse = await response.json();
    return result.companies;
  }

  async searchCompaniesByName(companyName: string): Promise<Company[]> {
    const response = await fetch(`${this.baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'searchCompaniesByName',
        companyName: companyName.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to search companies by name: ${response.status}`);
    }

    const result: SearchCompaniesResponse = await response.json();
    return result.companies;
  }

  async updateMemberCount(companyId: string, increment: number = 1): Promise<Company> {
    const response = await fetch(`${this.baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'updateMemberCount',
        companyId,
        increment,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to update member count: ${response.status}`);
    }

    const result: CompanyResponse = await response.json();
    return result.company;
  }
}

// Export a singleton instance
const companiesService = new CompaniesService();
export default companiesService; 