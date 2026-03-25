// services/api.js - CORRECTED VERSION

const API_URL = import.meta.env.VITE_API_URL;

const handleResponse = async (response) => {
  console.log("ðŸ“¡ Response status:", response.status);
  
  const text = await response.text();
  console.log("ðŸ“¡ Raw response:", text);
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("âŒ Failed to parse JSON:", e);
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};

export const budgetRequestsAPI = {
  async getAll(stage = '', status = '', gpNumber = '') {
    try {
      const params = new URLSearchParams();
      if (stage) params.append('stage', stage);
      if (status) params.append('status', status);
      if (gpNumber) params.append('gpNumber', gpNumber);
      
      console.log("ðŸ“¡ Fetching budget requests with params:", params.toString());
      const response = await fetch(`${API_URL}/budget-requests.php?${params}`);
      const result = await handleResponse(response);
      console.log("âœ… Fetched budget requests:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error fetching budget requests:", error);
      throw error;
    }
  },

  async getById(id) {
    try {
      console.log("ðŸ“¡ Fetching budget request:", id);
      const response = await fetch(`${API_URL}/budget-requests.php?id=${id}`);
      const result = await handleResponse(response);
      console.log("âœ… Fetched budget request:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error fetching budget request:", error);
      throw error;
    }
  },

  async getByStage(stage) {
    return this.getAll(stage);
  },

  async getPendingForAdmin() {
    return this.getAll('admin', 'pending');
  },

  async getPendingForAR() {
    return this.getAll('ar', 'admin_verified');
  },

  async getPendingForDR() {
    return this.getAll('dr', 'ar_approved');
  },

  async getPendingForAO2() {
    return this.getAll('ao2', 'dr_approved');
  },

  async getCompleted() {
    return this.getAll('', 'approved');
  },

  async getRejected() {
    return this.getAll('', 'rejected');
  },

  async create(data) {
    try {
      console.log("ðŸš€ Creating budget request:", data);
      const response = await fetch(`${API_URL}/budget-requests.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await handleResponse(response);
      console.log("âœ… Budget request created:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error creating budget request:", error);
      throw error;
    }
  },

  async forward(id, remarks, by = 'Admin User') {
    try {
      console.log("ðŸ“¤ Forwarding request:", id);
      const response = await fetch(`${API_URL}/budget-requests.php?id=${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'forward',
          stage: 'admin',
          remarks,
          by
        })
      });
      const result = await handleResponse(response);
      console.log("âœ… Request forwarded:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error forwarding request:", error);
      throw error;
    }
  },

  // AR APPROVAL - NEW METHOD
  async arApprove(id, remarks, by) {
    try {
      console.log(`âœ… AR Approving request:`, id);
      const response = await fetch(`${API_URL}/budget-requests.php?id=${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          stage: 'ar',
          remarks,
          by
        })
      });
      const result = await handleResponse(response);
      console.log("âœ… Request approved by AR:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error approving request (AR):", error);
      throw error;
    }
  },

  // DR APPROVAL - NEW METHOD
  async drApprove(id, remarks, by) {
    try {
      console.log(`âœ… DR Approving request:`, id);
      const response = await fetch(`${API_URL}/budget-requests.php?id=${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          stage: 'dr',
          remarks,
          by
        })
      });
      const result = await handleResponse(response);
      console.log("âœ… Request approved by DR:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error approving request (DR):", error);
      throw error;
    }
  },

  // AO2 APPROVAL - NEW METHOD
  async ao2Approve(id, remarks, by) {
    try {
      console.log(`âœ… AO2 Final Approving request:`, id);
      const response = await fetch(`${API_URL}/budget-requests.php?id=${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          stage: 'ao2',
          remarks,
          by
        })
      });
      const result = await handleResponse(response);
      console.log("âœ… Request FINAL approved by AO2:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error approving request (AO2):", error);
      throw error;
    }
  },

  async approve(id, stage, remarks, by) {
    try {
      console.log(`âœ… Approving request at ${stage}:`, id);
      const response = await fetch(`${API_URL}/budget-requests.php?id=${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          stage,
          remarks,
          by
        })
      });
      const result = await handleResponse(response);
      console.log("âœ… Request approved:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error approving request:", error);
      throw error;
    }
  },

  async reject(id, stage, remarks, by) {
    try {
      console.log(`âŒ Rejecting request at ${stage}:`, id);
      const response = await fetch(`${API_URL}/budget-requests.php?id=${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject',
          stage,
          remarks,
          by
        })
      });
      const result = await handleResponse(response);
      console.log("âœ… Request rejected:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error rejecting request:", error);
      throw error;
    }
  },

  async delete(id) {
    try {
      console.log("ðŸ—‘ï¸ Deleting budget request:", id);
      const response = await fetch(`${API_URL}/budget-requests.php?id=${id}`, {
        method: 'DELETE'
      });
      const result = await handleResponse(response);
      console.log("âœ… Budget request deleted:", result);
      return result;
    } catch (error) {
      console.error("âŒ Error deleting budget request:", error);
      throw error;
    }
  }
};

// Keep all other APIs unchanged...
export const projectAPI = {
  async getAll(search = '', status = '') {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status && status !== 'all') params.append('status', status);
      
      console.log("ðŸ“¡ GET: Fetching projects...");
      const response = await fetch(`${API_URL}/projects.php?${params}`);
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error in getAll:", error);
      throw error;
    }
  },

  async getById(id) {
    try {
      console.log("ðŸ“¡ Fetching project:", id);
      const response = await fetch(`${API_URL}/projects.php?id=${id}`);
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error fetching project:", error);
      throw error;
    }
  },

  async create(data) {
    try {
      console.log("ðŸš€ POST: Creating project with data:", data);
      const response = await fetch(`${API_URL}/projects.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error in create:", error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      console.log("ðŸ”„ Updating project:", id, data);
      const response = await fetch(`${API_URL}/projects.php?id=${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error updating project:", error);
      throw error;
    }
  },

  async delete(id) {
    try {
      console.log("ðŸ—‘ï¸ Deleting project:", id);
      const response = await fetch(`${API_URL}/projects.php?id=${id}`, {
        method: 'DELETE'
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error deleting project:", error);
      throw error;
    }
  }
};

export const projectHeadsAPI = {
  async getAll() {
    try {
      const response = await fetch(`${API_URL}/project-heads.php`);
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error fetching project heads:", error);
      throw error;
    }
  },

  async create(data) {
    try {
      const response = await fetch(`${API_URL}/project-heads.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error creating project head:", error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const response = await fetch(`${API_URL}/project-heads.php?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error updating project head:", error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`${API_URL}/project-heads.php?id=${id}`, {
        method: 'DELETE'
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error deleting project head:", error);
      throw error;
    }
  }
};

export const departmentsAPI = {
  async getAll() {
    try {
      const response = await fetch(`${API_URL}/departments.php`);
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error fetching departments:", error);
      throw error;
    }
  },

  async create(data) {
    try {
      const response = await fetch(`${API_URL}/departments.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error creating department:", error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const response = await fetch(`${API_URL}/departments.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error updating department:", error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`${API_URL}/departments.php?id=${id}`, {
        method: 'DELETE'
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error deleting department:", error);
      throw error;
    }
  }
};

export const principalInvestigatorsAPI = {
  async getAll(search = '', department = '', designation = '') {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      if (designation) params.append('designation', designation);
      
      const response = await fetch(`${API_URL}/principal-investigators.php?${params}`);
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error fetching PIs:", error);
      throw error;
    }
  },

  async create(data) {
    try {
      const response = await fetch(`${API_URL}/principal-investigators.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error creating PI:", error);
      throw error;
    }
  },

  async update(id, data) {
    try {
      const response = await fetch(`${API_URL}/principal-investigators.php?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error updating PI:", error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const response = await fetch(`${API_URL}/principal-investigators.php?id=${id}`, {
        method: 'DELETE'
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error deleting PI:", error);
      throw error;
    }
  }
};

export const releaseFundsAPI = {
  async getSanctionedProjects() {
    try {
      const response = await fetch(`${API_URL}/release-funds.php`);
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error fetching sanctioned projects:", error);
      throw error;
    }
  },

  async releaseFunds(data) {
    try {
      const response = await fetch(`${API_URL}/release-funds.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error releasing funds:", error);
      throw error;
    }
  },

  async deleteRelease(releaseId) {
    try {
      const response = await fetch(`${API_URL}/release-funds.php?id=${releaseId}`, {
        method: 'DELETE'
      });
      return handleResponse(response);
    } catch (error) {
      console.error("âŒ Error deleting release:", error);
      throw error;
    }
  }
};

export const testBackendConnection = async () => {
  try {
    console.log("ðŸ” Testing backend connection...");
    const response = await fetch(`${API_URL}/projects.php`);
    console.log("âœ… Backend response status:", response.status);
    return response.ok;
  } catch (error) {
    console.error("âŒ Backend is NOT reachable:", error);
    return false;
  }
};
