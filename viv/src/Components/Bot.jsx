"use client"

import { useState, useRef, useEffect } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import { Link, useNavigate } from "react-router-dom"
import Cookies from "js-cookie"
import toast from "react-hot-toast"
import { jwtDecode } from "jwt-decode"
import axios from "axios"
import { ThreeDots } from "react-loader-spinner"
import remarkGfm from "remark-gfm"
import Markdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"
import BACKENDURL from "./urls"
import { Copy, ThumbsUp, ThumbsDown, Send, Square, ArrowUp, Dot } from "lucide-react"

const ClaudeChatUI = () => {
  const navigate = useNavigate()
  const [selected, setSelected] = useState("Precise")
  const [messages, setMessages] = useState({})
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [model, setModel] = useState("numax")
  const [error, setError] = useState(null)
  const [activeChat, setActiveChat] = useState(null)
  const chatContainerRef = useRef(null)
  const inputRef = useRef(null)
  const [chatlist, setChatlist] = useState([])
  const userToken = Cookies.get("authToken")
  const isUserLoggedIn = !!userToken
  const [userData, setUserData] = useState(null)
  const [streamingChats, setStreamingChats] = useState({})
  const [streamController, setStreamController] = useState(null)
  const [partialResponse, setPartialResponse] = useState("")
  const [image, setImage] = useState(null)
  const [selectedOption, setSelectedOption] = useState("text")
  const [showMobileOptions, setShowMobileOptions] = useState(false)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [loadingChats, setLoadingChats] = useState({})
  const [chatLoader, setChatLoader] = useState(false)
  const dropdownRef = useRef(null)
  const [imageLoader, setImageLoader] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const activeTitle = chatlist.find((c) => c._id === activeChat)?.title
  const [feedback, setFeedback] = useState({})
  const [title, setTitle] = useState("")
  const [chat, setChat] = useState(null)
  const [onChatUpdate, setOnChatUpdate] = useState(null)
  const [generateChatTitle, setGenerateChatTitle] = useState(() => {})
  const [displayedText, setDisplayedText] = useState({})

  const handleLike = (index) => {
    alert("Thanks for your response!")
    setFeedback((prev) => ({ ...prev, [index]: "like" }))
  }

  const handleDislike = (index) => {
    alert("Thanks for your response!")
    setFeedback((prev) => ({ ...prev, [index]: "dislike" }))
  }

  function editChat(chatId) {
    const newTitle = prompt("Enter new chat title:")
    if (!newTitle) return

    axios
      .post(`${BACKENDURL}/chat/update/title`, {
        chatId: chatId,
        title: newTitle,
        userId: userData.userId,
      })
      .then((response) => {
        alert("Chat title updated successfully!")
      })
      .catch((error) => {
        console.error(error)
        alert("Error updating chat title.")
      })
  }

  const handleChatDelete = async (chatId) => {
    if (confirm("Are you sure you want to delete this chat?")) {
      const res = axios.post(`${BACKENDURL}/chat/delete`, { userId: userData.userId, chatId })
      console.log(res)
    }
  }

  const handleEditSave = async (e) => {
    e.stopPropagation()
    if (!title.trim()) return

    try {
      await axios.put(`/api/chat/${chat._id}/edit`, {
        title: title.trim(),
      })
      setIsEditing(false)
      if (onChatUpdate) onChatUpdate(chat._id, title.trim())
    } catch (error) {
      console.error("Edit failed:", error)
      alert("Failed to update chat title")
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Copied to clipboard!")
      })
      .catch((err) => {
        alert("Failed to copy text: ", err)
      })
  }

  const handleOptionChange = (e) => {
    setSelectedOption(e.target.value)
  }

  const generateImage = async () => {
    setImageLoader(true)
    if (!inputMessage.trim()) return
    if (!activeChat) {
      setError("No active chat selected. Please create or select a chat first.")
      return
    }

    const userMessage = {
      sender: "user",
      text: inputMessage,
      timestamp: new Date(),
      isImage: false,
    }

    setMessages((prevMessages) => ({
      ...prevMessages,
      [activeChat]: [...(prevMessages[activeChat] || []), userMessage],
    }))

    setImage(null)
    setError(null)

    try {
      const generatingMsg = {
        sender: "assistant",
        text: `Generating image based on: "${inputMessage}"...`,
        timestamp: new Date(),
        isImage: false,
      }

      setMessages((prevMessages) => ({
        ...prevMessages,
        [activeChat]: [...(prevMessages[activeChat] || []), generatingMsg],
      }))

      const token = Cookies.get("authToken")

      const response = await fetch(`${BACKENDURL}/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: inputMessage,
          chatId: activeChat,
          userId: userData.userId,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate image")

      const data = await response.json()
      const imageUrl = data.imageUrl

      localStorage.setItem("imageUrl", imageUrl)

      setMessages((prevMessages) => {
        const chatMessages = [...(prevMessages[activeChat] || [])]
        chatMessages[chatMessages.length - 1] = {
          sender: "assistant",
          text: `Image generated from prompt: "${inputMessage}"`,
          timestamp: new Date(),
          isImage: true,
          imageUrl: imageUrl,
        }

        return {
          ...prevMessages,
          [activeChat]: chatMessages,
        }
      })

      setInputMessage("")
    } catch (error) {
      console.error("Error generating image:", error)
      setError(`Failed to generate image: ${error.message}`)

      setMessages((prevMessages) => {
        const chatMessages = [...(prevMessages[activeChat] || [])]
        chatMessages[chatMessages.length - 1].text = `Error generating image: ${error.message}`

        return {
          ...prevMessages,
          [activeChat]: chatMessages,
        }
      })
    } finally {
      setImageLoader(false)
    }
  }

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter" && streamingChats[activeChat]) {
        stopStreamingResponse()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => {
      window.removeEventListener("keydown", handleKeyPress)
    }
  }, [streamingChats, activeChat])

  const stopStreamingResponse = () => {
    if (streamController && streamingChats[activeChat]) {
      streamController.abort()
      setStreamingChats((prev) => ({ ...prev, [activeChat]: false }))

      setMessages((prevMessages) => {
        const chatMessages = [...(prevMessages[activeChat] || [])]
        const lastMsg = chatMessages[chatMessages.length - 1]

        if (lastMsg?.sender === "assistant") {
          lastMsg.text = partialResponse + " [response interrupted]"
        }

        return {
          ...prevMessages,
          [activeChat]: chatMessages,
        }
      })
    }
  }

  useEffect(() => {
    if (isUserLoggedIn) {
      try {
        const decodedToken = jwtDecode(userToken)
        setUserData(decodedToken)
      } catch (error) {
        console.error("Error decoding token:", error)
        setUserData(null)
      }
    }
  }, [isUserLoggedIn, userToken])

  useEffect(() => {
    if (activeChat && userData) {
      fetchChatMessages(activeChat)
    }
  }, [activeChat, userData])

  useEffect(() => {
    if (isUserLoggedIn && userData) {
      fetchChats()
    }
  }, [isUserLoggedIn, userData, chatlist])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, loadingChats])

  useEffect(() => {
    inputRef.current?.focus()

    const handleGlobalKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage(e)
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown)
    }
  }, [inputMessage, messages])

  const fetchChatMessages = async (chatId) => {
    try {
      setChatLoader(true)
      console.log("Fetching messages for chat:", chatId)
      console.log("User ID:", userData.userId)

      const response = await fetch(`${BACKENDURL}/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          chatId,
          userId: userData.userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Error response:", data)
        throw new Error(data.message || "Failed to load messages")
      }

      console.log("Messages received:", data)

      const formattedMessages = data.messages.map((msg) => ({
        sender: msg.role,
        text: msg.content,
        timestamp: new Date(msg.timestamp || Date.now()),
      }))

      setMessages((prevMessages) => ({
        ...prevMessages,
        [chatId]: formattedMessages,
      }))
    } catch (error) {
      setChatLoader(false)
      console.error("❌ Fetch Error:", error)
      setError(`Failed to load messages: ${error.message}`)
    } finally {
      setChatLoader(false)
    }
  }

  const fetchChats = async () => {
    try {
      const response = await fetch(`${BACKENDURL}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          userId: userData.userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to load chats")
      }

      const chatsArray = Array.isArray(data.chats) ? data.chats : data && Array.isArray(data) ? data : []

      const sortedChats = chatsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      setChatlist(sortedChats)

      if (sortedChats.length > 0 && !activeChat) {
        setActiveChat(sortedChats[0]._id)
      }
    } catch (error) {
      console.error("Error fetching chats:", error)
      setError(`Failed to load chats: ${error.message}`)
    }
  }

  const handleNewChat = async () => {
    try {
      const response = await fetch(`${BACKENDURL}/chat/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ userId: userData.userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to create chat")
      }

      setMessages((prevMessages) => ({
        ...prevMessages,
        [data.chat._id]: [],
      }))

      setInputMessage("")
      setError(null)

      setActiveChat(data.chat._id)

      fetchChats()
    } catch (error) {
      console.error("Error creating new chat:", error)
      setError(`Failed to create a new chat: ${error.message}`)
    }
  }

  const handleSendMessage = async (e) => {
    setLoadingChats((prev) => ({ ...prev, [activeChat]: true }))
    e.preventDefault()

    if (streamController) {
      streamController.abort()
    }

    if (!inputMessage.trim() || isLoading) return

    if (!activeChat) {
      setError("No active chat selected. Please create or select a chat first.")
      return
    }

    if (selectedOption === "image") {
      await generateImage()
    } else {
      const userMessage = {
        sender: "user",
        text: inputMessage,
        timestamp: new Date(),
      }

      setMessages((prevMessages) => ({
        ...prevMessages,
        [activeChat]: [...(prevMessages[activeChat] || []), userMessage],
      }))

      const currentChatMessages = [...(messages[activeChat] || []), userMessage]

      setInputMessage("")
      setIsLoading(true)
      setError(null)
      setPartialResponse("")
      setDisplayedText((prev) => ({ ...prev, [activeChat]: "" }))

      try {
        const controller = new AbortController()
        setStreamController(controller)
        setStreamingChats((prev) => ({ ...prev, [activeChat]: true }))

        const response = await fetch(`${BACKENDURL}/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            model: model,
            messages: currentChatMessages.map((msg) => ({
              role: msg.sender,
              content: msg.text,
            })),
            userId: userData.userId,
            chatId: activeChat,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to get response")
        }

        if (!response.body) throw new Error("Response body is null")

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulatedText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          chunk.split("\n").forEach((line) => {
            if (!line.trim() || line.startsWith("data: [DONE]")) return

            try {
              const json = JSON.parse(line.replace("data: ", "").trim())
              if (json.text) {
                accumulatedText = json.text
                setPartialResponse(accumulatedText)

                setMessages((prevMessages) => {
                  const chatMessages = [...(prevMessages[activeChat] || [])]
                  const lastMsg = chatMessages[chatMessages.length - 1]

                  if (lastMsg?.sender === "assistant") {
                    lastMsg.text = accumulatedText
                    return {
                      ...prevMessages,
                      [activeChat]: chatMessages,
                    }
                  } else {
                    return {
                      ...prevMessages,
                      [activeChat]: [
                        ...chatMessages,
                        {
                          sender: "assistant",
                          text: accumulatedText,
                          timestamp: new Date(),
                        },
                      ],
                    }
                  }
                })
              }
            } catch (error) {
              console.warn("Error parsing JSON chunk:", error, line)
            }
          })
        }

        const currentMessages = currentChatMessages.length + 1
        if (currentMessages === 2 && activeChat) {
          setTimeout(() => generateChatTitle(activeChat), 500)
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("Response streaming was aborted by user")
        } else {
          console.error("Error calling backend:", err)
          setError(`Failed to get response: ${err.message}`)
        }
      } finally {
        setIsLoading(false)
        setStreamingChats((prev) => ({ ...prev, [activeChat]: false }))
        setStreamController(null)
        setLoadingChats((prev) => ({ ...prev, [activeChat]: false }))
      }
    }
  }

  useEffect(() => {
    if (partialResponse && streamingChats[activeChat]) {
      let currentIndex = displayedText[activeChat]?.length || 0
      const fullText = partialResponse

      const typeCharacter = () => {
        if (currentIndex < fullText.length) {
          setDisplayedText((prev) => ({
            ...prev,
            [activeChat]: fullText.slice(0, currentIndex + 1),
          }))
          currentIndex += 1
          setTimeout(typeCharacter, 5)
        }
      }

      typeCharacter()
    }
  }, [partialResponse, streamingChats, activeChat])

  const handleChatClick = (chatId) => {
    setActiveChat(chatId)
  }

  const [user, setUser] = useState(null)

  const fetchUser = async () => {
    try {
      const response = await axios.post(`${BACKENDURL}/fetch/user`, {
        id: userData.userId,
      })

      if (response.data) {
        setUser(response.data)
      }
    } catch (error) {
    }
  }

  useEffect(() => {
    fetchUser()
  })

  const handleLogOut = () => {
    Cookies.remove("authToken")
    navigate("/auth")
    toast.success("Logged out sucessfull")
  }

  useEffect(() => {
    const messagesContainer = chatContainerRef.current
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }

    const messageElements = document.querySelectorAll(".message")
    messageElements.forEach((el, index) => {
      setTimeout(() => {
        el.classList.add("visible")
      }, index * 100)
    })
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMobileOptions(false)
      }
    }

    if (showMobileOptions) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMobileOptions])

  const HighlightedBox = ({ children }) => (
    <div
      style={{
        padding: "5px",
        borderRadius: "8px",
        margin: "10px 0",
      }}
    >
      {children}
    </div>
  )

  return (
    <div className="container-fluid p-0">
      <div className="row g-0">
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
            }}
          >
            <div
              className="col-3 sidebar"
              style={{
                backgroundColor: "#171717",
                color: "white",
                height: "100vh",
              }}
            >
              <div className="p-3 d-flex">
                <div className="bg-dark p-2 rounded me-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="white"
                    className="bi bi-chat-square-text"
                    viewBox="0 0 16 16"
                  >
                    <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12z" />
                    <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
                  </svg>
                </div>
                <div>
                  <div className="fw-bold">Chat Threads</div>
                  <div className="text small">{chatlist.length} conversations</div>
                </div>
              </div>

              <div
                className="sidebar-section-header"
                style={{
                  padding: "10px 15px",
                  color: "#6c757d",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Your Chats
              </div>

              <div className="customer-scrollbar" style={{ overflowY: "scroll", height: "65vh" }}>
                {chatlist.map((chat) => (
                  <div
                    key={chat._id}
                    className={`chat-list-item ${activeChat === chat._id ? "active" : ""}`}
                    style={{
                      cursor: "pointer",
                      padding: "10px 15px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: activeChat === chat._id ? "#212020" : "transparent",
                    }}
                    onClick={() => handleChatClick(chat._id)}
                  >
                    <span className="text-truncate">
                      {chat.title || `Chat from ${new Date(chat.createdAt).toLocaleDateString()}`}
                    </span>
                    <button className="btn btn-sm text-muted p-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-three-dots-vertical"
                        viewBox="0 0 16 16"
                      >
                        <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <div
                className="sidebar-footer mt-auto"
                style={{
                  padding: "15px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <button
                  className="btn btn-light w-100 d-flex align-items-center justify-content-center"
                  onClick={handleNewChat}
                  style={{
                    background: "#222222",
                    color: "white",
                    border: "none",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="white"
                    className="bi bi-plus me-2"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                  </svg>
                  New Chat
                </button>
              </div>

              <div className="d-flex justify-content-between p-3">
                <Link to="/">
                  <button className="btn btn-sm text-muted">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="white"
                      className="bi bi-house"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5Z" />
                    </svg>
                  </button>
                </Link>

                <Link to="/dashboard">
                  <button className="btn btn-sm text-muted">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="white"
                      className="bi bi-gear"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592..." />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div
          className="col-3 sidebar d-none d-md-block | sidebar"
          style={{
            backgroundColor: "#171717",
            color: "white",
            height: "100vh",
          }}
        >
          <div className="p-3 d-flex">
            <div className="bg-dark p-2 rounded me-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="white"
                className="bi bi-chat-square-text"
                viewBox="0 0 16 16"
              >
                <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12z" />
                <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z" />
              </svg>
            </div>
            <div>
              <div className="fw-bold">Chat Threads</div>
              <div className="text small">{chatlist.length} conversations</div>
            </div>
          </div>

          <div
            className="sidebar-section-header"
            style={{
              padding: "10px 15px",
              color: "#6c757d",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Your Chats
          </div>

          <div className="customer-scrollbar" style={{ overflowY: "scroll", height: "65vh" }}>
            {chatlist.map((chat) => (
              <div
                key={chat._id}
                className={`chat-list-item ${activeChat === chat._id ? "active" : ""}`}
                style={{
                  cursor: "pointer",
                  padding: "10px 15px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: activeChat === chat._id ? "#212020" : "transparent",
                }}
                onClick={() => handleChatClick(chat._id)}
              >
                <span className="text-truncate">
                  {chat.title || `Chat from ${new Date(chat.createdAt).toLocaleDateString()}`}
                </span>
                <div class="dropdown">
                  <button
                    class="btn"
                    type="button"
                    id="dropdownMenuButton1"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-three-dots-vertical"
                      viewBox="0 0 16 16"
                    >
                      <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                    </svg>
                  </button>
                  <ul class="dropdown-menu bg-black" aria-labelledby="dropdownMenuButton1">
                    <li onClick={(e) => editChat(chat._id)}>
                      <a class="dropdown-item text-white bg-black" href="#">
                        Edit Chat
                      </a>
                    </li>
                    <li onClick={(e) => handleChatDelete(chat._id)}>
                      <a class="dropdown-item text-white bg-black" href="#">
                        Delete Chat
                      </a>
                    </li>
                    <li></li>
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div
            className="sidebar-footer mt-auto"
            style={{
              padding: "15px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <button
              className="btn btn-light w-100 d-flex align-items-center justify-content-center"
              onClick={handleNewChat}
              style={{ background: "#222222", color: "white", border: "none" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="white"
                className="bi bi-plus me-2"
                viewBox="0 0 16 16"
              >
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
              </svg>
              New Chat
            </button>
          </div>

          <div className="d-flex justify-content-between p-3">
            <Link to="/">
              <button className="btn btn-sm text-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="white"
                  className="bi bi-house"
                  viewBox="0 0 16 16"
                >
                  <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5Z" />
                </svg>
              </button>
            </Link>
            <Link to="/dashboard">
              <button className="btn btn-sm text-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="white"
                  className="bi bi-gear"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592..." />
                </svg>
              </button>
            </Link>
          </div>
        </div>

        <div className="col-9 main-div" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <div
            className="chat-header d-flex justify-content-between align-items-center"
            style={{ padding: "15px", backgroundColor: "#222222" }}
          >
            <div className="d-flex align-items-center">
              <button className="btn text-white d-md-none" onClick={() => setSidebarOpen(true)}>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="white"
                className="bi bi-file-earmark me-2"
                viewBox="0 0 16 16"
              >
                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
              </svg>
              <h1 className="h5 mb-0 fw-bold chat-title" style={{ color: "white" }}>
                {activeChat
                  ? (activeTitle?.length > 25 ? activeTitle.slice(0, 25) + "..." : activeTitle) || "Chat"
                  : "New Chat"}
              </h1>
            </div>
            <div className="form-group mb-0 d-flex align-items-center gap-3">
              <select
                className="form-control"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{
                  background: "#2E2F2E",
                  border: "none",
                  color: "white",
                }}
              >
                <option value="numax">Numax</option>
              </select>

              <div className="dropdown">
                {!user?.profile ? (
                  <ThreeDots
                    height="35"
                    width="35"
                    radius="9"
                    color="#ffffff"
                    ariaLabel="three-dots-loading"
                    wrapperStyle={{}}
                    visible={true}
                  />
                ) : (
                  <img
                    src={user.profile || "/placeholder.svg"}
                    alt="Profile"
                    className="dropdown-toggle"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    style={{
                      width: "60px",
                      height: "35px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #ccc",
                      cursor: "pointer",
                    }}
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = "/default-avatar.png"
                    }}
                  />
                )}
                <ul className="dropdown-menu dropdown-menu-end" style={{ backgroundColor: "#2E2F2E" }}>
                  <li>
                    <button
                      className="dropdown-item text-white"
                      style={{ backgroundColor: "transparent" }}
                      onClick={handleLogOut}
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div
            className="card h-auto p-0"
            style={{
              border: "none",
              width: "100%",
              background: "#222222",
              borderRadius: "0px",
            }}
          >
            <div
              className="card-body chat-content customer-scrollbar"
              ref={chatContainerRef}
              style={{
                height: "591px",
                overflowY: "auto",
                width: "100%",
                overflowX: "auto",
              }}
            >
              <style>
                {`
                  .customer-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                  }
                  .customer-scrollbar::-webkit-scrollbar-track {
                    background: #444;
                    border-radius: 3px;
                  }
                  .customer-scrollbar::-webkit-scrollbar-thumb {
                    background: #cccccc;
                    border-radius: 3px;
                  }
                  .customer-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #aaaaaa;
                  }
                  .shining-text {
                    position: relative;
                    font-family: sans-serif;
                    overflow: hidden;
                    background: linear-gradient(90deg, #000, #fff, #000);
                    background-repeat: no-repeat;
                    background-size: 80%;
                    animation: shine 1.9s linear infinite;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: rgba(255, 255, 255, 0);
                    color: white;
                    margin-top: 10px;
                    padding: 0px 20px;
                    font-style: italic;
                  }
                  @keyframes shine {
                    0% {
                      background-position: -500%;
                    }
                    100% {
                      background-position: 500%;
                    }
                  }
                  @media (max-width: 768px) {
                    .table-responsive-wrapper {
                      display: block;
                      overflow-x: auto;
                      -webkit-overflow-scrolling: touch;
                    }
                    .table-responsive-wrapper table {
                      max-width: 100%;
                      width: auto;
                      min-width: 100%;
                    }
                    .table-responsive-wrapper th,
                    .table-responsive-wrapper td {
                      white-space: nowrap;
                      min-width: 100px;
                    }
                  }
                `}
              </style>
              {chatLoader ? (
                <div className="chat-skeleton-container">
                  {[1, 2, 3, 4, 5, 6].map((item, i) => (
                    <div key={i} className={`chat-skeleton ${i % 2 === 0 ? "left" : "right"}`}>
                      <div
                        className="bubble"
                        style={{
                          height: "60px",
                          width: "60%",
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
              ) : !messages[activeChat] || messages[activeChat].length === 0 ? (
                <div className="text-center" style={{ color: "white" }}>
                  <h4>Start a conversation</h4>
                  <p>Type a message below to begin chatting.</p>
                  <div className="container d-flex justify-content-center mt-5">
                    <div
                      className="card p-3 shadow-sm border-0 model-type"
                      style={{
                        width: "70%",
                        background: "#313031",
                        color: "white",
                        borderRadius: "20px",
                      }}
                    >
                      <p className="text-center mb-2">Choose how you want the AI to respond</p>
                      <div className="btn-group w-100 model-options">
                        {["Precise", "Balanced", "Creative"].map((option) => (
                          <button
                            key={option}
                            className={`btn ${selected === option ? "btn-dark" : "btn-light"} flex-fill`}
                            onClick={() => setSelected(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <p className="text-center mt-2">
                        {selected === "Precise"
                          ? "More deterministic and focused responses, best for factual or technical questions"
                          : selected === "Balanced"
                            ? "A mix of precision and creativity, suitable for most queries"
                            : "More open-ended and imaginative responses, great for brainstorming or storytelling"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                messages[activeChat].map((msg, index) => (
                  <div key={index}>
                    <div
                      className={`message ${msg.sender === "user" ? "user-message" : "ai-message"}`}
                      style={{
                        textAlign: msg.sender === "user" ? "right" : "left",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        className="response"
                        style={{
                          display: "inline-block",
                          padding: msg.sender === "user" ? "3px 8px" : "1px 15px",
                          borderRadius: "15px",
                          maxWidth: msg.sender === "user" ? "45%" : "65%",
                          backgroundColor: msg.sender === "user" ? "#2E2F2E" : "",
                          color: "white",
                        }}
                      >
                        {msg.isImage ? (
                          <img
                            src={msg.imageUrl || "/placeholder.svg"}
                            alt="Generated content"
                            style={{ maxWidth: "100%", borderRadius: "10px" }}
                          />
                        ) : (
                          <>
                            <Markdown
                              remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
                              components={{
                                code: ({ inline, className, children }) => {
                                  const language = className?.replace("language-", "")
                                  return inline ? (
                                    <code
                                      style={{
                                        background: "#2a2a2a",
                                        padding: "3px 6px",
                                        borderRadius: "4px",
                                        color: "#ffcccb",
                                        border: "1px solid #444",
                                        fontFamily: "'Fira Code', monospace",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {children}
                                    </code>
                                  ) : (
                                    <div
                                      style={{
                                        position: "relative",
                                        margin: "15px 0",
                                        background: "#1e1e1e",
                                        borderRadius: "8px",
                                        padding: "15px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                      }}
                                    >
                                      <button
                                        onClick={() => handleCopy(String(children))}
                                        style={{
                                          position: "absolute",
                                          top: "10px",
                                          right: "10px",
                                          background: "#444",
                                          color: "white",
                                          border: "none",
                                          padding: "5px 10px",
                                          borderRadius: "5px",
                                          cursor: "pointer",
                                          fontSize: "14px",
                                          transition: "background 0.2s",
                                        }}
                                        onMouseEnter={(e) => (e.target.style.background = "#555")}
                                        onMouseLeave={(e) => (e.target.style.background = "#444")}
                                      >
                                        Copy
                                      </button>
                                      <SyntaxHighlighter
                                        language={language}
                                        style={dracula}
                                        customStyle={{ margin: 0, background: "transparent", fontSize: "14px" }}
                                      >
                                        {children}
                                      </SyntaxHighlighter>
                                    </div>
                                  )
                                },
                                h1: ({ children }) => (
                                  <HighlightedBox>
                                    <h1
                                      style={{
                                        fontSize: "2em",
                                        margin: "0.8em 0",
                                        color: "#ffffff",
                                        borderBottom: "2px solid #66b3ff",
                                        paddingBottom: "8px",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {children}
                                    </h1>
                                  </HighlightedBox>
                                ),
                                h2: ({ children }) => (
                                  <HighlightedBox>
                                    <h2
                                      style={{
                                        fontSize: "1.6em",
                                        margin: "0.7em 0",
                                        color: "#e6e6e6",
                                        borderBottom: "1px solid #555",
                                        paddingBottom: "6px",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {children}
                                    </h2>
                                  </HighlightedBox>
                                ),
                                h3: ({ children }) => (
                                  <HighlightedBox>
                                    <h3
                                      style={{
                                        fontSize: "1.3em",
                                        margin: "0.6em 0",
                                        color: "#d4d4d4",
                                        fontWeight: "500",
                                      }}
                                    >
                                      {children}
                                    </h3>
                                  </HighlightedBox>
                                ),
                                p: ({ children }) => (
                                  <HighlightedBox>
                                    <p
                                      style={{
                                        margin: "0.8em 0",
                                        lineHeight: "1.8",
                                        color: "#d4d4d4",
                                        letterSpacing: "0.02em",
                                      }}
                                    >
                                      {children}
                                    </p>
                                  </HighlightedBox>
                                ),
                                ul: ({ children }) => (
                                  <HighlightedBox>
                                    <ul
                                      style={{
                                        margin: "0.8em 0",
                                        paddingLeft: "25px",
                                        color: "#d4d4d4",
                                        listStyleType: "none",
                                      }}
                                    >
                                      {children}
                                    </ul>
                                  </HighlightedBox>
                                ),
                                ol: ({ children }) => (
                                  <HighlightedBox>
                                    <ol
                                      style={{
                                        margin: "0.8em 0",
                                        paddingLeft: "25px",
                                        color: "#d4d4d4",
                                        listStyleType: "decimal",
                                      }}
                                    >
                                      <style>
                                        {`
                                          ol li::marker {
                                            color: #66b3ff;
                                            fontWeight: 500;
                                          }
                                        `}
                                      </style>
                                      {children}
                                    </ol>
                                  </HighlightedBox>
                                ),
                                li: ({ ordered, children }) => (
                                  <li
                                    style={{
                                      margin: "0.5em 0",
                                      color: "#d4d4d4",
                                      position: "relative",
                                      paddingLeft: "20px",
                                    }}
                                  >
                                    {!ordered && (
                                      <span
                                        style={{
                                          position: "absolute",
                                          left: "-20px",
                                          top: "-8px",
                                          color: "#ffffff",
                                        }}
                                      >
                                        <Dot size={40}/>
                                      </span>
                                    )}
                                    {children}
                                  </li>
                                ),
                                a: ({ href, children }) => (
                                  <HighlightedBox>
                                    <a
                                      href={href}
                                      style={{
                                        color: "#66b3ff",
                                        textDecoration: "none",
                                        position: "relative",
                                        transition: "color 0.2s",
                                      }}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onMouseEnter={(e) => {
                                        e.target.style.color = "#99ccff"
                                        e.target.style.textDecoration = "underline"
                                      }}
                                      onMouseLeave={(e) => {
                                        e.target.style.color = "#66b3ff"
                                        e.target.style.textDecoration = "none"
                                      }}
                                    >
                                      {children}
                                      <span style={{ marginLeft: "5px", fontSize: "0.9em" }}>↗</span>
                                    </a>
                                  </HighlightedBox>
                                ),
                                blockquote: ({ children }) => (
                                  <HighlightedBox>
                                    <blockquote
                                      style={{
                                        borderLeft: "4px solid #66b3ff",
                                        padding: "10px 15px",
                                        margin: "1em 0",
                                        color: "#d4d4d4",
                                        fontStyle: "italic",
                                        borderRadius: "0 8px 8px 0",
                                      }}
                                    >
                                      {children}
                                    </blockquote>
                                  </HighlightedBox>
                                ),
                                table: ({ children }) => (
                                  <HighlightedBox>
                                    <div className="table-responsive-wrapper">
                                      <table
                                        style={{
                                          width: "100%",
                                          borderCollapse: "collapse",
                                          margin: "1em 0",
                                          background: "#2a2a2a",
                                          borderRadius: "8px",
                                          overflow: "hidden",
                                        }}
                                      >
                                        {children}
                                      </table>
                                    </div>
                                  </HighlightedBox>
                                ),
                                thead: ({ children }) => (
                                  <thead style={{ background: "#3a3b3c" }}>{children}</thead>
                                ),
                                tbody: ({ children }) => (
                                  <tbody>{children}</tbody>
                                ),
                                tr: ({ children }) => (
                                  <tr
                                    style={{
                                      background: "transparent",
                                      "&:nth-child(even)": { background: "#333" },
                                    }}
                                  >
                                    {children}
                                  </tr>
                                ),
                                th: ({ children }) => (
                                  <th
                                    style={{
                                      padding: "12px",
                                      textAlign: "left",
                                      color: "#ffffff",
                                      borderBottom: "1px solid #444",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td
                                    style={{
                                      padding: "12px",
                                      color: "#d4d4d4",
                                      borderBottom: "1px solid #444",
                                    }}
                                  >
                                    {children}
                                  </td>
                                ),
                                strong: ({ children }) => (
                                  <strong
                                    style={{
                                      fontWeight: "700",
                                      color: "#ffffff",
                                    }}
                                  >
                                    {children}
                                  </strong>
                                ),
                                em: ({ children }) => (
                                  <em
                                    style={{
                                      fontStyle: "italic",
                                      color: "#cccccc",
                                    }}
                                  >
                                    {children}
                                  </em>
                                ),
                                hr: () => (
                                  <HighlightedBox>
                                    <hr
                                      style={{
                                        border: "none",
                                        height: "1px",
                                        background: "linear-gradient(to right, #66b3ff, #333)",
                                        margin: "1.5em 0",
                                      }}
                                    />
                                  </HighlightedBox>
                                ),
                              }}
                            >
                              {msg.sender === "assistant" &&
                              index === messages[activeChat].length - 1 &&
                              streamingChats[activeChat]
                                ? displayedText[activeChat] || ""
                                : String(msg.text || "").trim()}
                            </Markdown>
                          </>
                        )}
                      </div>
                      <div className="timestamp text-white small">{msg.timestamp.toLocaleTimeString()}</div>
                    </div>

                    {msg.sender === "user" &&
                      index === messages[activeChat].length - 1 &&
                      loadingChats[activeChat] &&
                      selectedOption === "text" && (
                        <div
                          className="my-2"
                          style={{
                            textAlign: "left",
                            marginBottom: "15px",
                          }}
                        >
                          <p className="shining-text">
                            Hmm let me think...
                          </p>
                        </div>
                      )}
                  </div>
                ))
              )}

              {imageLoader && selectedOption === "image" && (
                <div className="my-4">
                  <p
                    style={{
                      color: "white",
                      marginTop: "10px",
                      padding: "0px 20px",
                    }}
                  >
                    Image is generating...
                  </p>
                </div>
              )}

              {error && (
                <div className="alert alert-danger mt-3" role="alert">
                  {error}
                </div>
              )}
            </div>

            <div className="card-footer" style={{ border: "none", background: "#222222", padding: "15px" }}>
              <form onSubmit={handleSendMessage} className="d-flex align-items-center">
                <div
                  className="input-group"
                  style={{
                    background: "#313031",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                    padding: "8px",
                    transition: "box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)")}
                >
                  <div className="d-flex align-items-center w-100">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      className="form-control border-0 bg-transparent shadow-none input-textarea"
                      placeholder="Ask anything..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      style={{
                        fontSize: "16px",
                        color: "white",
                        resize: "none",
                        minHeight: "40px",
                        maxHeight: "120px",
                        background: "transparent",
                        borderRadius: "8px",
                        padding: "10px 15px",
                        transition: "background-color 0.2s",
                      }}
                      onFocus={(e) => (e.target.style.backgroundColor = "#3a3b3c")}
                      onBlur={(e) => (e.target.style.backgroundColor = "transparent")}
                      onInput={(e) => {
                        e.target.style.height = "auto"
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                      }}
                    />

                    <div className="d-none d-md-flex align-items-center gap-2">
                      <select
                        className="form-select form-select-sm"
                        aria-label="Options"
                        style={{
                          backgroundColor: "#171717",
                          border: "1px solid #3a3b3c",
                          color: "white",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "14px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        value={selectedOption}
                        onChange={handleOptionChange}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#3a3b3c"
                          e.target.style.borderColor = "#ffffff"
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#171717"
                          e.target.style.borderColor = "#3a3b3c"
                        }}
                      >
                        <option value="text">Text</option>
                        <option value="image">Generate Image</option>
                      </select>

                      <button
                        type="button"
                        className="btn btn-sm rounded-circle"
                        onClick={streamingChats[activeChat] ? stopStreamingResponse : handleSendMessage}
                        disabled={streamingChats[activeChat] ? false : !inputMessage.trim() || isLoading}
                        style={{
                          width: "40px",
                          height: "40px",
                          backgroundColor: streamingChats[activeChat] || inputMessage.trim() ? "#171717" : "#2a2a2a",
                          color: streamingChats[activeChat] || inputMessage.trim() ? "white" : "#666",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background-color 0.2s",
                          cursor: (streamingChats[activeChat] || inputMessage.trim()) && !isLoading ? "pointer" : "pointer",
                        }}
                        onMouseEnter={(e) => {
                          if (streamingChats[activeChat] || (inputMessage.trim() && !isLoading)) {
                            e.target.style.backgroundColor = "#3a3b3c"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (streamingChats[activeChat] || inputMessage.trim()) {
                            e.target.style.backgroundColor = "#171717"
                          }
                        }}
                      >
                        {streamingChats[activeChat] ? <Square size={20} /> : <ArrowUp size={20} />}
                      </button>
                    </div>

                    <div className="d-flex d-md-none align-items-center position-relative">
                      <button
                        type="button"
                        className="btn btn-sm rounded-circle"
                        style={{
                          width: "42px",
                          height: "42px",
                          backgroundColor: "#171717",
                          color: "white",
                        }}
                        onClick={() => setShowMobileOptions(!showMobileOptions)}
                      >
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm rounded-circle"
                        onClick={streamingChats[activeChat] ? stopStreamingResponse : handleSendMessage}
                        disabled={streamingChats[activeChat] ? false : !inputMessage.trim() || isLoading}
                        style={{
                          width: "40px",
                          height: "40px",
                          backgroundColor: streamingChats[activeChat] || inputMessage.trim() ? "#171717" : "#2a2a2a",
                          color: streamingChats[activeChat] || inputMessage.trim() ? "white" : "#666",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background-color 0.2s",
                          cursor: (streamingChats[activeChat] || inputMessage.trim()) && !isLoading ? "pointer" : "pointer",
                          marginLeft: "5px",
                        }}
                        onMouseEnter={(e) => {
                          if (streamingChats[activeChat] || (inputMessage.trim() && !isLoading)) {
                            e.target.style.backgroundColor = "#3a3b3c"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (streamingChats[activeChat] || inputMessage.trim()) {
                            e.target.style.backgroundColor = "#171717"
                          }
                        }}
                      >
                        {streamingChats[activeChat] ? <Square size={20} /> : <ArrowUp size={20} />}
                      </button>
                      {showMobileOptions && (
                        <div
                          className="position-absolute end-0 mt-2 p-2 rounded shadow | mobile-options-dropdown"
                          style={{ backgroundColor: "#171717", zIndex: 1000 }}
                          ref={dropdownRef}
                        >
                          <select
                            className="form-select form-select-sm mb-1"
                            value={selectedOption}
                            onChange={handleOptionChange}
                            style={{
                              background: "#2a2a2a",
                              color: "white",
                              border: "none",
                            }}
                          >
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                          </select>
                          <button
                            type="button"
                            className="btn btn-sm text-white w-100"
                            style={{ backgroundColor: "#2a2a2a" }}
                          >
                            <i className="bi bi-mic-fill me-1"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClaudeChatUI