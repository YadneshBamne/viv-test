"use client"

import { useState, useEffect, useRef } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import { LayoutDashboard, User2, MessageCircle, RefreshCw, Plus, Shield, Clock, Database, Play, Code, Copy, CheckCircle } from 'lucide-react'
import { ScaleLoader, BounceLoader } from "react-spinners"
import "../App.css"
import axios from "axios"
import Cookies from "js-cookie"
import { jwtDecode } from "jwt-decode"
import { Link } from "react-router-dom"
import { Card, Form, Button, Alert, Spinner, Badge } from "react-bootstrap"
import useDeleteTool from "../hooks/useDeleteTool"
import { Trash2Icon } from 'lucide-react'
import BACKENDURL from "./urls"

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("Monthly")
  const [currentSection, setCurrentSection] = useState("Dashboard")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userData, setUserData] = useState(null)
  const userToken = Cookies.get("authToken")
  const isUserLoggedIn = !!userToken
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [tools, setTools] = useState([])
  const [count, setCount] = useState("")
  const [showEndpointModal, setShowEndpointModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [newEndpoint, setNewEndpoint] = useState(null)
  const userId = userData?.userId
  const [lastUpdated, setLastUpdated] = useState(null)

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(userData?.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const displayId = userData?.userId
    ? `${userData.userId.slice(0, 5)}...`
    : "Loading...";

  const {
    deleteTool,
    loading: deleteLoading,
    error: deleteError,
  } = useDeleteTool(userId, (deletedEndpoint) => {
    setTools((prev) => prev.filter((tool) => tool.endpoint !== deletedEndpoint))
  })

  const handleDelete = (endpoint) => {
    if (confirm("Are you sure you want to delete this tool?")) {
      deleteTool(endpoint)
    }
  }

  useEffect(() => {
    if (isUserLoggedIn) {
      try {
        const decodedToken = jwtDecode(userToken)
        setUserData(decodedToken)
        console.log("User data:", decodedToken)
      } catch (error) {
        console.error("Error decoding token:", error)
        setUserData(null)
      }
    }
  }, [isUserLoggedIn, userToken])

  const fetchDeveloper = async () => {
    try {
      setIsRefreshing(true)
      const response = await axios.post(`${BACKENDURL}/fetch/developerToken`, { userId: userData.userId })
      setTools(response.data.developerTools)
      setLastUpdated(new Date())
    } catch (error) {
      console.log(error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchUserCount = async () => {
    try {
      const res = await axios.post(`${BACKENDURL}/count`, { userId: userData.userId })
      setCount(res.data.count)
    } catch (error) {
      console.error("Error fetching count:", error)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Only run this effect when Dashboard section is active
    if (currentSection === "Dashboard" && userData?.userId) {
      // Set up interval for real-time updates
      const intervalId = setInterval(() => {
        fetchDeveloper()
        fetchUserCount()
      }, 100000)

      // Initial fetch
      fetchDeveloper()
      fetchUserCount()

      // Clean up interval on component unmount or when section changes
      return () => clearInterval(intervalId)
    }
  }, [currentSection, userData])

  const handleSectionChange = (section) => setCurrentSection(section)

  const handleManualRefresh = () => {
    if (currentSection === "Dashboard" && userData?.userId) {
      fetchDeveloper()
      fetchUserCount()
    }
  }

  const Playground = () => {
    const [formData, setFormData] = useState({
      userId: "6803f10ca56aa18d2df8584e",
      prompt: "hello, who are you?",
      model: "Numax",
      instructions: "You are a fairy",
      stream: false,
      endpoint: "",
    })

    const [response, setResponse] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)

    const handleChange = (e) => {
      const { name, value } = e.target
      const newValue = name === "stream" ? e.target.checked : value

      setFormData({
        ...formData,
        [name]: newValue,
      })
    }

    const handleSubmit = async (e) => {
      e.preventDefault()
      setLoading(true)
      setError(null)
      setResponse(null)

      try {
        if (!formData.endpoint) {
          throw new Error("Endpoint ID is required")
        }

        const payload = {
          userId: formData.userId,
          prompt: formData.prompt,
          model: formData.model,
          instructions: formData.instructions,
          stream: formData.stream,
        }

        const response = await axios.post(`${BACKENDURL}/completions/${formData.endpoint}`, payload)

        setResponse(response.data)
      } catch (err) {
        setError(err.response?.data?.message || err.message || "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    const copyToClipboard = () => {
      if (response) {
        navigator.clipboard.writeText(JSON.stringify(response, null, 2))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }

    return (
      <div className="container-fluid p-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="text-white mb-1">API Playground</h2>
            <p className="text-white-50 mb-0">Test your API endpoints with different parameters</p>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <Card className="shadow-sm h-100" style={{ background: "#1E1E1F", borderRadius: "12px", border: "none" }}>
              <Card.Header className="py-3" style={{ background: "#252526", borderBottom: "1px solid #333" }}>
                <h5 className="mb-0 text-white d-flex align-items-center">
                  <Code className="me-2" size={18} />
                  Request Parameters
                </h5>
              </Card.Header>
              <Card.Body>
                {error && (
                  <Alert variant="danger" className="animate__animated animate__shakeX mb-4">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium text-white">Endpoint ID</Form.Label>
                    <Form.Control
                      type="text"
                      name="endpoint"
                      placeholder="Enter your endpoint ID"
                      value={formData.endpoint}
                      onChange={handleChange}
                      required
                      style={{
                        background: "#2A2A2B",
                        border: "1px solid #444",
                        borderRadius: "6px",
                        padding: "10px 12px",
                        color: "white"
                      }}
                    />
                    <Form.Text style={{ color:"#f2f2f2"}}>The endpoint ID from your dashboard</Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium text-white">User ID</Form.Label>
                    <Form.Control
                      type="text"
                      name="userId"
                      value={formData.userId}
                      onChange={handleChange}
                      required
                      style={{
                        background: "#2A2A2B",
                        color: "white",
                        border: "1px solid #444",
                        borderRadius: "6px",
                        padding: "10px 12px",
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium text-white">Prompt</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="prompt"
                      value={formData.prompt}
                      onChange={handleChange}
                      required
                      style={{
                        background: "#2A2A2B",
                        color: "white",
                        border: "1px solid #444",
                        borderRadius: "6px",
                        padding: "10px 12px",
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium text-white">Model</Form.Label>
                    <Form.Control
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      required
                      style={{
                        background: "#2A2A2B",
                        color: "white",
                        border: "1px solid #444",
                        borderRadius: "6px",
                        padding: "10px 12px",
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-medium text-white">Instructions</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleChange}
                      style={{
                        background: "#2A2A2B",
                        color: "white",
                        border: "1px solid #444",
                        borderRadius: "6px",
                        padding: "10px 12px",
                      }}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Check
                      type="switch"
                      id="stream-switch"
                      label="Stream Response"
                      name="stream"
                      checked={formData.stream}
                      onChange={handleChange}
                      className="text-white"
                    />
                    <Form.Text style={{ color: "#f2f2f2"}}>Enable streaming for real-time responses</Form.Text>
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100"
                    disabled={loading}
                    style={{
                      background: "#0070f3",
                      borderColor: "#0070f3",
                      borderRadius: "6px",
                    }}
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play size={16} className="me-2" />
                        Run Completion
                      </>
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </div>

          <div className="col-md-6">
            <Card className="shadow-sm h-100" style={{ background: "#1E1E1F", borderRadius: "12px", border: "none" }}>
              <Card.Header
                className="py-3 d-flex justify-content-between align-items-center"
                style={{ background: "#252526", borderBottom: "1px solid #333" }}
              >
                <h5 className="mb-0 text-white">Response</h5>
                {response && (
                  <Button variant="outline-secondary" size="sm" onClick={copyToClipboard} style={{ borderRadius: "6px" }}>
                    {copied ? (
                      <>
                        <CheckCircle size={14} className="me-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="me-1" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </Card.Header>
              <Card.Body
                style={{
                  background: "#1E1E1F",
                  maxHeight: "600px",
                  overflowY: "auto",
                }}
              >
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <span className="ms-3 text-white">Fetching response...</span>
                  </div>
                ) : response ? (
                  <pre
                    style={{
                      background: "#252526",
                      color: "#e6e6e6",
                      padding: "1rem",
                      borderRadius: "6px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: "100%",
                      overflowY: "auto",
                    }}
                  >
                    {JSON.stringify(response, null, 2)}
                  </pre>
                ) : (
                  <div className="text-center py-5 text-white-50">
                    <Code size={48} className="mb-3" />
                    <p>Response will appear here after you run a completion</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  const UserProfile = () => {
    const [isProfileLoading, setIsProfileLoading] = useState(false)
    const [isChangePasswordPopupOpened, setIsChangePasswordPopupOpened] = useState(false)
    const [isDataChanged, setIsDataChanged] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [currentPassword, setCurrentPassword] = useState("")
    const [uploadingImage, setUploadingImage] = useState(false)
    const [alertInfo, setAlertInfo] = useState({ show: false, message: "", variant: "" })
    const fileInputRef = useRef(null)

    // Initialize profile data directly without useEffect
    const initialData = userData
      ? {
        name: userData.fullName || "",
        email: userData.email || "",
        password: "",
        profilePic: userData.profilePic || "",
      }
      : { name: "", email: "", password: "", profilePic: "" }

    // Set initial state values
    const [profileData, setProfileData] = useState(initialData)
    const [savedProfileData, setSavedProfileData] = useState(initialData)
    const [imagePreview, setImagePreview] = useState(initialData.profilePic || null)

    const handleInputChange = (field, value) => {
      setProfileData({ ...profileData, [field]: value })
      setIsDataChanged(true)
    }

    const handleChangePassword = () => setIsChangePasswordPopupOpened(true)

    const handlePasswordSave = () => {
      if (newPassword !== confirmPassword) {
        setAlertInfo({
          show: true,
          message: "New password and confirm password do not match",
          variant: "danger",
        })
        return
      }
      if (newPassword) {
        handleSave(true)
        setIsChangePasswordPopupOpened(false)
      }
    }

    const handleImageUpload = (e) => {
      const file = e.target.files[0]
      if (!file) return

      setUploadingImage(true)

      if (file.size > 5 * 1024 * 1024) {
        setAlertInfo({
          show: true,
          message: "Image size should not exceed 5MB",
          variant: "danger",
        })
        setUploadingImage(false)
        return
      }

      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      if (!validTypes.includes(file.type)) {
        setAlertInfo({
          show: true,
          message: "Only JPG, PNG, GIF, and WEBP formats are supported",
          variant: "danger",
        })
        setUploadingImage(false)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const base64String = event.target.result
        setImagePreview(base64String)
        handleInputChange("profilePic", base64String)
        setUploadingImage(false)
        setIsDataChanged(true)
      }
      reader.onerror = () => {
        setAlertInfo({
          show: true,
          message: "Error reading file",
          variant: "danger",
        })
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    }

    const handleSave = async (isPasswordChange = false) => {
      try {
        setIsProfileLoading(true)
        const saveData = {
          userId: userData.userId,
          name: profileData.name,
          email: profileData.email,
        }

        if (isPasswordChange) {
          saveData.password = newPassword
        } else if (profileData.profilePic !== savedProfileData.profilePic) {
          saveData.profilePic = profileData.profilePic
        }

        const response = await axios.post(`${BACKENDURL}/updateUser`, saveData, { userId: userData.userId })
        setAlertInfo({
          show: true,
          message: isPasswordChange ? "Password updated successfully" : "Profile data saved successfully",
          variant: "success",
        })

        setTimeout(() => {
          setAlertInfo({ show: false, message: "", variant: "" })
        }, 3000)

        if (!isPasswordChange) {
          setIsDataChanged(false)
          setSavedProfileData({ ...profileData })

          // Update the main userData state to reflect changes
          if (userData) {
            const updatedUserData = {
              ...userData,
              fullName: profileData.name,
              email: profileData.email,
              profilePic: profileData.profilePic,
            }
            setUserData(updatedUserData)
          }
        } else {
          setNewPassword("")
          setConfirmPassword("")
          setCurrentPassword("")
        }
      } catch (error) {
        console.error("Error saving profile data:", error.response?.data || error)
        setAlertInfo({
          show: true,
          message: error.response?.data?.error || "Failed to save profile data",
          variant: "danger",
        })
      } finally {
        setIsProfileLoading(false)
      }
    }

    const handleCancel = () => {
      setProfileData(savedProfileData)
      setImagePreview(savedProfileData.profilePic || null)
      setIsDataChanged(false)
    }

    const triggerFileInput = () => {
      fileInputRef.current.click()
    }

    const removeProfilePicture = () => {
      setImagePreview(null)
      handleInputChange("profilePic", "")
    }

    if (isProfileLoading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "300px" }}>
          <ScaleLoader color="#007bff" />
        </div>
      )
    }

    return (
      <div
        className="card shadow-sm"
        style={{ background: "#1E1E1F", color: "white", borderRadius: "12px", overflow: "hidden" }}
      >
        <div
          className="card-header d-flex justify-content-between align-items-center py-3"
          style={{ background: "#252526", borderBottom: "1px solid #333" }}
        >
          <h5 className="mb-0 d-flex align-items-center">
            <User2 className="me-2" size={18} />
            User Profile
          </h5>
          <div>
            <button
              className="btn btn-outline-secondary me-2"
              disabled={!isDataChanged}
              onClick={handleCancel}
              style={{ borderRadius: "6px" }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!isDataChanged}
              onClick={() => handleSave(false)}
              style={{ borderRadius: "6px", background: "#0070f3", borderColor: "#0070f3" }}
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="card-body p-4">
          {alertInfo.show && (
            <Alert
              variant={alertInfo.variant}
              onClose={() => setAlertInfo({ ...alertInfo, show: false })}
              dismissible
              className="animate__animated animate__fadeIn"
            >
              {alertInfo.message}
            </Alert>
          )}

          <div className="row">
            <div className="col-md-4 mb-4 d-flex flex-column align-items-center">
              <div
                className="profile-pic-container mb-3 position-relative"
                style={{
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#2A2A2B",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  border: "3px solid #333",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease",
                }}
              >
                {uploadingImage ? (
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-75">
                    <BounceLoader color="#0070f3" size={60} />
                  </div>
                ) : imagePreview ? (
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <User2 size={80} color="#666" />
                )}
              </div>

              <div className="d-flex gap-2 mb-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="d-none"
                  accept="image/png, image/jpeg, image/gif, image/webp"
                />
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={triggerFileInput}
                  disabled={uploadingImage}
                  style={{ borderRadius: "6px" }}
                >
                  {uploadingImage ? "Uploading..." : "Change Photo"}
                </button>

                {imagePreview && (
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={removeProfilePicture}
                    disabled={uploadingImage}
                    style={{ borderRadius: "6px" }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <small className="text-white-50 text-center">
                Recommended: Square JPG, PNG, GIF or WEBP
                <br />
                Max size: 5MB
              </small>
            </div>

            <div className="col-md-8">
              <div className="row mb-4">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-medium">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    style={{
                      background: "#2A2A2B",
                      color: "white",
                      border: "1px solid #444",
                      borderRadius: "6px",
                      padding: "10px 12px",
                    }}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-medium">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={profileData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    style={{
                      background: "#2A2A2B",
                      color: "white",
                      border: "1px solid #444",
                      borderRadius: "6px",
                      padding: "10px 12px",
                    }}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-medium">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value="********"
                    disabled
                    style={{
                      background: "#2A2A2B",
                      color: "white",
                      border: "1px solid #444",
                      borderRadius: "6px",
                      padding: "10px 12px",
                    }}
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                style={{
                  background: "#2A2A2B",
                  borderColor: "#444",
                  borderRadius: "6px",
                }}
              >
                <Shield size={16} className="me-2" />
                Change Password
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`modal fade ${isChangePasswordPopupOpened ? "show d-block" : ""}`}
          tabIndex="-1"
          role="dialog"
          aria-labelledby="changePasswordModal"
          style={{
            display: isChangePasswordPopupOpened ? "block" : "none",
            background: isChangePasswordPopupOpened ? "rgba(0,0,0,0.5)" : "transparent",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ background: "#1E1E1F", borderRadius: "12px" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #333" }}>
                <h5 className="modal-title" id="changePasswordModal">
                  <Shield size={16} className="me-2" />
                  Change Password
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setIsChangePasswordPopupOpened(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      background: "#2A2A2B",
                      color: "white",
                      border: "1px solid #444",
                      borderRadius: "6px",
                    }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      background: "#2A2A2B",
                      color: "white",
                      border: "1px solid #444",
                      borderRadius: "6px",
                    }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      background: "#2A2A2B",
                      color: "white",
                      border: "1px solid #444",
                      borderRadius: "6px",
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: "1px solid #333" }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setIsChangePasswordPopupOpened(false)}
                  style={{ borderRadius: "6px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePasswordSave}
                  style={{
                    borderRadius: "6px",
                    background: "#0070f3",
                    borderColor: "#0070f3",
                  }}
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const EndpointCreationUI = ({ onClose }) => {
    const [formData, setFormData] = useState({
      name: "",
      tokens: 5000,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleChange = (e) => {
      const { name, value } = e.target
      setFormData({
        ...formData,
        [name]: name === "tokens" ? Number.parseInt(value, 10) : value,
      })
    }

    const handleSubmit = async (e) => {
      e.preventDefault()
      setLoading(true)
      setError(null)

      try {
        const response = await axios.post(`${BACKENDURL}/create-endpoint/${userData.userId}`, formData)

        if (response.data.success) {
          setNewEndpoint(response.data)
          fetchDeveloper() // Refresh tools list
          setShowEndpointModal(false) // Close creation modal
          setShowSuccessModal(true) // Open success modal
          setFormData({ name: "", tokens: 5000 }) // Reset form
        }
      } catch (err) {
        setError(err.response?.data?.message || "An error occurred while creating the endpoint")
      } finally {
        setLoading(false)
      }
    }

    return (
      <>
        <div className="modal-body">
          {error && (
            <Alert variant="danger" className="animate__animated animate__shakeX">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3 animate__animated animate__fadeIn" style={{ animationDelay: "0.1s" }}>
              <Form.Label className="fw-bold">Endpoint Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="My Cool API Endpoint"
                value={formData.name}
                onChange={handleChange}
                required
                className="shadow-sm api-input"
                style={{
                  background: "#2A2A2B",
                  color: "white",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  padding: "10px 12px",
                }}
              />
            </Form.Group>

            <div className="modal-footer">
              <Button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                style={{ borderRadius: "6px" }}
              >
                Close
              </Button>
              <Button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  borderRadius: "6px",
                  background: "#0070f3",
                  borderColor: "#0070f3",
                }}
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  "Create API"
                )}
              </Button>
            </div>
          </Form>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#232223",
        }}
      >
        <div className="text-center">
          <ScaleLoader color="#0070f3" height={50} width={5} radius={2} margin={2} />
          <p className="mt-3 text-white-50">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column flex-md-row min-vh-100">
      {/* Mobile Sidebar */}
      <div
        className={`mobile-sidebar-overlay ${isSidebarOpen ? "open" : ""} d-md-none`}
        onClick={() => setSidebarOpen(false)}
      >
        <div
          className="mobile-sidebar"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#171717",
            color: "white",
            width: "75%",
            height: "100vh",
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1050,
            overflowY: "auto",
            transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
            transform: isSidebarOpen ? "translateX(0)" : "translateX(-100%)",
            padding: "20px",
          }}
        >
          <h1 className="h4 fw-bold text-light mb-4">VIV AI</h1>
          <ul className="nav flex-column">
            <li className="nav-item mb-2">
              <Link className="nav-link d-flex align-items-center text-light" to="/">
                <span className="me-2">
                  <MessageCircle />
                </span>
                Chats
              </Link>
            </li>
            <li className="nav-item mb-2">
              <a
                href="#"
                className={`nav-link d-flex align-items-center text-light ${currentSection === "Dashboard" ? "active" : ""}`}
                onClick={() => handleSectionChange("Dashboard")}
              >
                <span className="me-2">
                  <LayoutDashboard />
                </span>{" "}
                Dashboard
              </a>
            </li>
            <li className="nav-item mb-2">
              <a
                href="#"
                className={`nav-link d-flex align-items-center text-light ${currentSection === "Playground" ? "active" : ""}`}
                onClick={() => handleSectionChange("Playground")}
              >
                <span className="me-2">
                  <Code />
                </span>{" "}
                Playground
              </a>
            </li>
            <li className="nav-item mb-2">
              <a
                href="#"
                className={`nav-link d-flex align-items-center text-light ${currentSection === "Profile" ? "active" : ""}`}
                onClick={() => handleSectionChange("Profile")}
              >
                <span className="me-2">
                  <User2 />
                </span>{" "}
                Profile
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div
        className="col-3 sidebar d-none d-md-block"
        style={{
          backgroundColor: "#171717",
          color: "white",
          height: "100vh",
          padding: "20px",
          boxShadow: "2px 0 10px rgba(0,0,0,0.2)",
        }}
      >
        <h1 className="h4 fw-bold text-light mb-4">VIV AI</h1>
        <ul className="nav flex-column">
          <li className="nav-item mb-3">
            <Link
              className="nav-link d-flex align-items-center text-light rounded py-2 px-3 transition-all"
              to="/"
              style={{
                transition: "all 0.2s ease",
                hover: { backgroundColor: "rgba(255,255,255,0.1)" },
              }}
            >
              <span className="me-2">
                <MessageCircle />
              </span>
              Chats
            </Link>
          </li>
          <li className="nav-item mb-3">
            <a
              href="#"
              className={`nav-link d-flex align-items-center rounded py-2 px-3 ${currentSection === "Dashboard" ? "text-white bg-primary" : "text-light hover-bg-light-10"
                }`}
              onClick={() => handleSectionChange("Dashboard")}
              style={{ transition: "all 0.2s ease" }}
            >
              <span className="me-2">
                <LayoutDashboard />
              </span>{" "}
              Dashboard
            </a>
          </li>
          <li className="nav-item mb-3">
            <a
              href="#"
              className={`nav-link d-flex align-items-center rounded py-2 px-3 ${currentSection === "Playground" ? "text-white bg-primary" : "text-light hover-bg-light-10"
                }`}
              onClick={() => handleSectionChange("Playground")}
              style={{ transition: "all 0.2s ease" }}
            >
              <span className="me-2">
                <Code />
              </span>{" "}
              Playground
            </a>
          </li>
          <li className="nav-item mb-3">
            <a
              href="#"
              className={`nav-link d-flex align-items-center rounded py-2 px-3 ${currentSection === "Profile" ? "text-white bg-primary" : "text-light hover-bg-light-10"
                }`}
              onClick={() => handleSectionChange("Profile")}
              style={{ transition: "all 0.2s ease" }}
            >
              <span className="me-2">
                <User2 />
              </span>{" "}
              Profile
            </a>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div
        className="flex-grow-1 p-3 p-md-5"
        style={{
          height: "100vh",
          overflowY: "auto",
          paddingRight: "1rem",
          background: "#232223",
        }}
      >
        <button
          className="btn text-white d-md-none mb-4"
          onClick={() => setSidebarOpen(true)}
          style={{ background: "#1E1E1F", borderRadius: "8px" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="white"
            className="bi bi-list"
            viewBox="0 0 16 16"
          >
            <path
              fillRule="evenodd"
              d="M2.5 12.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0-4a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm0-4a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11z"
            />
          </svg>
        </button>

        {currentSection === "Dashboard" && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="text-white mb-1">Developer Dashboard</h2>
                <p className="text-white-50 mb-0">Manage your API endpoints and monitor usage</p>
              </div>
              <div className="d-flex gap-2">
                <Button
                  className="d-flex align-items-center"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  style={{
                    background: "#2A2A2B",
                    borderColor: "#444",
                    borderRadius: "6px",
                  }}
                >
                  <RefreshCw size={16} className={`me-2 ${isRefreshing ? "spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
                <Button
                  className="d-flex align-items-center"
                  style={{
                    background: "#0070f3",
                    borderColor: "#0070f3",
                    borderRadius: "6px",
                  }}
                  onClick={() => setShowEndpointModal(true)}
                >
                  
                  Create Endpoint
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div
                  className="card h-100 shadow-sm"
                  style={{ background: "#1E1E1F", borderRadius: "12px", border: "none" }}
                >
                  <div className="card-body d-flex align-items-center">
                    <div className="rounded-circle p-3 me-3" style={{ background: "rgba(0, 112, 243, 0.1)" }}>
                      <Database size={24} color="#0070f3" />
                    </div>
                    <div>
                      <h6 className="text-white-50 mb-1">Total Endpoints</h6>
                      <h3 className="text-white mb-0">{tools.length}</h3>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div
                  className="card h-100 shadow-sm"
                  style={{ background: "#1E1E1F", borderRadius: "12px", border: "none" }}
                >
                  <div className="card-body d-flex align-items-center">
                    <div className="rounded-circle p-3 me-3" style={{ background: "rgba(0, 112, 243, 0.1)" }}>
                      <Clock size={24} color="#0070f3" />
                    </div>
                    <div>
                      <h6 className="text-white-50 mb-1">Last Updated</h6>
                      <h3 className="text-white mb-0">
                        {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Never"}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div
                  className="card h-100 shadow-sm"
                  style={{
                    background: "#1E1E1F",
                    borderRadius: "12px",
                    border: "none",
                  }}
                >
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="rounded-circle p-3 me-3"
                      style={{ background: "rgba(0, 112, 243, 0.1)" }}
                    >
                      <Shield size={24} color="#0070f3" />
                    </div>
                    <div className="d-flex flex-column">
                      <h6 className="text-white-50 mb-1">Your User ID</h6>
                      <div className="d-flex align-items-center">
                        <h5 className="text-white mb-0 me-2">{displayId}</h5>
                        <button
                          onClick={handleCopy}
                          className="btn btn-sm btn-outline-light"
                          title="Copy User ID"
                        >
                          <Copy size={16} />
                        </button>
                        {copied && (
                          <small className="text-success ms-2">Copied!</small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="card shadow-sm mb-4"
              style={{ background: "#1E1E1F", borderRadius: "12px", border: "none" }}
            >
              <div className="card-header py-3" style={{ background: "#252526", borderBottom: "1px solid #333" }}>
                <h5 className="mb-0 text-white">API Endpoints</h5>
              </div>
              <div className="card-body p-0">
                {tools.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-white-50 p-2">No endpoints found. Create your first endpoint to get started.</p>
                    <Button
                      className="mt-2"
                      onClick={() => setShowEndpointModal(true)}
                      style={{
                        background: "#0070f3",
                        borderColor: "#0070f3",
                        borderRadius: "6px",
                      }}
                    >
                      
                      Create Endpoint 
                      
                    </Button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-dark table-hover mb-0">
                      <thead style={{ background: "#252526" }}>
                        <tr>
                          <th className="py-3 px-4 border-0">Name</th>
                          <th className="py-3 px-4 border-0">Endpoint</th>
                          <th className="py-3 px-4 border-0">Token</th>
                          <th className="py-3 px-4 border-0">Tokens Balance</th>
                          <th className="py-3 px-4 border-0">Created At</th>
                          <th className="py-3 px-4 border-0">Last Used</th>
                          <th className="py-3 px-4 border-0 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tools.map((tool, index) => (
                          <tr key={index} style={{ background: index % 2 === 0 ? "#1E1E1F" : "#252526" }}>
                            <td className="py-3 px-4">
                              <div className="fw-medium">{tool.name}</div>
                            </td>
                            <td className="py-3 px-4">
                              <code className="bg-dark text-white px-2 py-1 rounded">{tool.endpoint}</code>
                            </td>
                            <td className="py-3 px-4">{tool.token || "—"}</td>
                            <td className="py-3 px-4">
                              <Badge bg={tool.tokens > 1000 ? "success" : "warning"} pill>
                                {tool.tokens}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="d-flex align-items-center">
                                <Clock size={14} className="me-2 text-muted" />
                                {new Date(tool.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {tool.lastUsedAt ? new Date(tool.lastUsedAt).toLocaleString() : "Never"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(tool.endpoint)}
                                disabled={deleteLoading}
                                style={{ borderRadius: "6px" }}
                              >
                                <Trash2Icon size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {currentSection === "Profile" && <UserProfile />}
        {currentSection === "Playground" && <Playground />}

        {/* Endpoint Creation Modal */}
        <div
          className={`modal fade ${showEndpointModal ? "show" : ""}`}
          id="endpointModal"
          tabIndex="-1"
          role="dialog"
          aria-labelledby="endpointModalTitle"
          aria-hidden={!showEndpointModal}
          style={{ display: showEndpointModal ? "block" : "none" }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content" style={{ background: "#1E1E1F", borderRadius: "12px" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #333" }}>
                <h5 className="modal-title" id="endpointModalTitle">
                  <Plus size={16} className="me-2" />
                  Create API Endpoint
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowEndpointModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <EndpointCreationUI onClose={() => setShowEndpointModal(false)} />
            </div>
          </div>
        </div>
        {showEndpointModal && <div className="modal-backdrop fade show"></div>}

        {/* Success Modal */}
        <div
          className={`modal fade ${showSuccessModal ? "show" : ""}`}
          id="successModal"
          tabIndex="-1"
          role="dialog"
          aria-labelledby="successModalTitle"
          aria-hidden={!showSuccessModal}
          style={{ display: showSuccessModal ? "block" : "none" }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content" style={{ background: "#1E1E1F", borderRadius: "12px" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #333" }}>
                <h5 className="modal-title" id="successModalTitle">
                  Endpoint Creation Success
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSuccessModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                {newEndpoint && (
                  <Card
                    className="shadow-sm animate__animated animate__zoomIn"
                    style={{ background: "#252526", border: "none", borderRadius: "8px" }}
                  >
                    <Card.Body>
                      <div className="mb-3">
                        <strong className="text-white">Endpoint Name:</strong>{" "}
                        <span className="text-white">{newEndpoint.toolName}</span>
                      </div>
                      <div className="mb-3">
                        <strong className="text-white">Endpoint ID:</strong>
                        <code
                          className="ms-2 p-2 border rounded d-block mt-2"
                          style={{ background: "#1E1E1F", color: "white", borderColor: "#444" }}
                        >
                          {newEndpoint.endpoint}
                        </code>
                      </div>
                      <div className="mb-3">
                        <strong className="text-white">Token Balance:</strong>{" "}
                        <span className="text-success">{newEndpoint.tokens}</span>
                      </div>
                      <Alert variant="success" className="animate__animated animate__fadeIn mb-0">
                        <Shield size={16} className="me-2" />
                        Save this endpoint ID securely! You'll need it for API authentication.
                      </Alert>
                    </Card.Body>
                  </Card>
                )}
              </div>
              <div className="modal-footer" style={{ borderTop: "1px solid #333" }}>
                <Button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowSuccessModal(false)}
                  style={{
                    borderRadius: "6px",
                    background: "#0070f3",
                    borderColor: "#0070f3",
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
        {showSuccessModal && <div className="modal-backdrop fade show"></div>}
      </div>
    </div>
  )
}

export default Dashboard
