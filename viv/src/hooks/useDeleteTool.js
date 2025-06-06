import { useState } from 'react';
import axios from 'axios';
import BACKENDURL from '../Components/urls';

const useDeleteTool = (userId, onSuccess) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteTool = async (endpoint) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.delete(`${BACKENDURL}/delete-endpoint/${userId}`, {
        data: { endpoint }, // DELETE must use 'data' to send body in Axios
      });

      if (response.data.success) {
        onSuccess(endpoint); // Remove from UI
      }
    } catch (err) {
      console.error('[DeleteTool] Error:', err);
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return { deleteTool, loading, error };
};

export default useDeleteTool;
