import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiGif from '../assets/ai.gif'
import userGif from '../assets/user.gif'

const Home = () => {
  const {userData, serverUrl, setUserData, getGeminiResponse} = useContext(userDataContext)
  const navigate = useNavigate()
  const [listening, setListening] = useState(false)
  const [assistantResponse, setAssistantResponse] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentGif, setCurrentGif] = useState("none") // "none", "user", "ai"
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [questionHistory, setQuestionHistory] = useState([])
  const menuRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const recognitionRef = useRef(null)
  const synth = window.speechSynthesis

  // Load history from localStorage when component mounts
  useEffect(() => {
    const savedHistory = localStorage.getItem('virtualAssistantHistory')
    if (savedHistory) {
      setQuestionHistory(JSON.parse(savedHistory))
    }
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('virtualAssistantHistory', JSON.stringify(questionHistory))
  }, [questionHistory])

  const clearHistory = () => {
    setQuestionHistory([])
    localStorage.removeItem('virtualAssistantHistory')
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true })
      setUserData(null)
      navigate('/signin')
    } catch (error) {
      setUserData(null)
      console.log(error)
    }
  }

  const handleCommand = (data) => {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'google-search':
        const googleQuery = encodeURIComponent(data.userInput || '')
        if (googleQuery) {
          window.open(`https://www.google.com/search?q=${googleQuery}`, '_blank')
        }
        break;
      case 'youtube-search':
        const youtubeQuery = encodeURIComponent(data.userInput || '')
        if (youtubeQuery) {
          window.open(`https://www.youtube.com/results?search_query=${youtubeQuery}`, '_blank')
        }
        break;
      case 'calculator-open':
        window.open('https://www.google.com/search?q=calculator', '_blank')
        break;
      case 'weather-show':
        window.open('https://www.google.com/search?q=weather', '_blank')
        break;
      case 'instagram-open':
        window.open('https://www.instagram.com', '_blank')
        break;
      case 'facebook-open':
        window.open('https://www.facebook.com', '_blank')
        break;
      case 'whatsapp-open':
        window.open('https://web.whatsapp.com', '_blank')
        break;
      case 'maps-open':
        window.open('https://www.google.com/maps', '_blank')
        break;
      case 'gmail-open':
        window.open('https://mail.google.com', '_blank')
        break;
      case 'translate-open':
        window.open('https://translate.google.com', '_blank')
        break;
      case 'github-open':
        window.open('https://github.com', '_blank')
        break;
      case 'linkedin-open':
        window.open('https://www.linkedin.com', '_blank')
        break;
    }
  }

  // Function to check if text contains Hindi characters
  const containsHindi = (text) => {
    const hindiRange = /[\u0900-\u097F]/
    return hindiRange.test(text)
  }

  const Speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    const isHindi = containsHindi(text)

    // Set language based on content
    utterance.lang = isHindi ? 'hi-IN' : 'en-US'

    // Helper: detect if assistant name is likely female
    const isFemaleAssistant = () => {
      const name = (userData?.assistantName || '').toString().toLowerCase().trim()
      if (!name) return false
      const femaleNames = ['mary','sarah','linda','emma','olivia','sophia','mia','isabella','ava','emily','anna','maria','neha','asha','anya','aya']
      if (femaleNames.includes(name)) return true
      // Simple heuristic: many female names end with 'a' or 'ah' or 'i'
      if (/[a|e|i|y|ah]$/.test(name)) return true
      return false
    }

    const preferFemale = isFemaleAssistant()

    // Get available voices
    const voices = synth.getVoices()

    // Choose candidate voices matching language
    const candidates = voices.filter(v => {
      const lang = (v.lang || '').toLowerCase()
      if (isHindi) return lang.includes('hi')
      return lang.includes('en')
    })

    // Names/substrings commonly found in female voices
    const femaleVoiceHints = ['samantha','victoria','karen','amelia','olivia','sara','sarah','anna','emma','female']

    let selectedVoice = null
    if (preferFemale) {
      selectedVoice = candidates.find(v => femaleVoiceHints.some(h => v.name.toLowerCase().includes(h)))
      if (!selectedVoice) selectedVoice = candidates.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
    }

    // Fallback selection
    if (!selectedVoice) {
      selectedVoice = voices.find(v => (v.lang || '').toLowerCase().includes(utterance.lang.toLowerCase()))
      if (!selectedVoice) selectedVoice = candidates[0] || voices[0]
    }

    if (selectedVoice) utterance.voice = selectedVoice

    isSpeakingRef.current = true
    setIsSpeaking(true)
    setCurrentGif('ai') // Show AI speaking animation

    utterance.onend = () => {
      isSpeakingRef.current = false
      setIsSpeaking(false)
      // When assistant finishes, show user GIF and clear response text as per behavior
      setCurrentGif('user')
      setAssistantResponse('')
      // Only try to start recognition if it's not already running
      if (!listening) {
        try {
          recognitionRef.current?.start()
        } catch (error) {
          if (error.name === 'InvalidStateError') {
            console.log('Recognition already running')
          } else {
            console.error('Recognition start error:', error)
          }
        }
      }
    }

    // Handle voice loading (some browsers populate voices asynchronously)
    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', () => {
        const updated = synth.getVoices()
        const updatedCandidates = updated.filter(v => {
          const lang = (v.lang || '').toLowerCase()
          if (isHindi) return lang.includes('hi')
          return lang.includes('en')
        })
        let updatedSelected = null
        if (preferFemale) {
          updatedSelected = updatedCandidates.find(v => femaleVoiceHints.some(h => v.name.toLowerCase().includes(h)))
          if (!updatedSelected) updatedSelected = updatedCandidates.find(v => v.name.toLowerCase().includes('female'))
        }
        if (!updatedSelected) {
          updatedSelected = updated.find(v => (v.lang || '').toLowerCase().includes(utterance.lang.toLowerCase()))
          if (!updatedSelected) updatedSelected = updatedCandidates[0] || updated[0]
        }
        if (updatedSelected) utterance.voice = updatedSelected
        synth.speak(utterance)
      }, { once: true })
    } else {
      synth.speak(utterance)
    }
  }

  useEffect(() => {
    if (!userData) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    // Support both English and Hindi
    recognition.lang = 'en-US';  // Default to English
    recognitionRef.current = recognition;

    const safeRecognition = () => {
      if (!isSpeakingRef.current && !listening) {
        try {
          recognition.start();
          console.log("Recognition request to start");
          setListening(true);
          setCurrentGif("user"); // Show user speaking animation
          setAssistantResponse(""); // Clear any previous response
        } catch (error) {
          if (error.name !== 'InvalidStateError') {
            console.log("Start error:", error);
          }
        }
      }
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      setListening(false);
      
      // Keep showing user GIF if we're not speaking
      if (!isSpeakingRef.current) {
        setCurrentGif("user");
        setTimeout(() => {
          safeRecognition();
        }, 10000);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      setListening(false);
      if (event.error !== 'aborted' && !isSpeakingRef.current) {
        setTimeout(() => {
          safeRecognition();
        }, 10000);
      }
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log('Heard:', transcript);

      // Add question to history with timestamp
      const newQuestion = {
        text: transcript,
        timestamp: new Date().toLocaleString()
      }
      setQuestionHistory(prev => [newQuestion, ...prev])

      try {
        const data = await getGeminiResponse(transcript);
        console.log('Assistant response:', data);
        
        if (!data) {
          throw new Error('No response received');
        }
        
        // Handle search commands if it's not an error
        if (data.type && data.type !== 'error') {
          handleCommand(data);
        }
        
        // Update and speak the response if available
        if (data.response) {
          setAssistantResponse(data.response);
          if ('speechSynthesis' in window) {
            Speak(data.response);
          } else {
            console.warn('SpeechSynthesis API not supported in this browser.');
          }
        }
      } catch (err) {
        console.error('Error handling response:', err);
        // Speak and display a friendly error message
        const errorMsg = "I'm sorry, but I'm having trouble processing your request right now. Please try again.";
        setAssistantResponse(errorMsg);
        if ('speechSynthesis' in window) {
          Speak(errorMsg);
        }
      }
    };

    // Initial start
    safeRecognition();

    // Cleanup on unmount
    return () => {
      try {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.stop();
        setListening(false);
      } catch (e) {}
    };
  }, [userData]);

  return (
    <div className='w-full min-h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center 
    items-center flex-col gap-[15px] relative px-4'>
      {/* Navigation buttons container - responsive positioning */}
      <div className='fixed top-0 left-0 right-0 flex justify-end items-center w-full p-4 gap-2 
        bg-gradient-to-b from-[#02023d] to-transparent z-10'>
        <div className='flex flex-row gap-2 max-w-[1200px] px-2' ref={menuRef}>
          <div className='relative'>
            <button 
              className='w-[35px] sm:w-[40px] md:w-[45px] 
              h-[35px] sm:h-[40px] md:h-[45px] 
              text-black font-semibold bg-white/90 
              rounded-full text-[20px] sm:text-[24px] 
              cursor-pointer transition-all hover:bg-white
              flex items-center justify-center backdrop-blur-sm'
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              ☰
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className='absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white/90 backdrop-blur-sm
              ring-1 ring-black ring-opacity-5 divide-y divide-gray-300'>
                <div className='py-1'>
                  <button
                    onClick={() => {
                      navigate("/customize");
                      setIsMenuOpen(false);
                    }}
                    className='w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 
                    transition-colors'
                  >
                    Customize Assistant
                  </button>
                  <button
                    onClick={() => {
                      setShowHistory(true);
                      setIsMenuOpen(false);
                    }}
                    className='w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 
                    transition-colors'
                  >
                    View History
                  </button>
                </div>
                <div className='py-1'>
                  <button
                    onClick={() => {
                      handleLogOut();
                      setIsMenuOpen(false);
                    }}
                    className='w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 
                    transition-colors'
                  >
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-20'
          onClick={() => setShowHistory(false)}>
          <div className='bg-white/95 rounded-2xl p-6 w-[90%] max-w-[600px] max-h-[80vh] overflow-hidden'
            onClick={e => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold'>Questions History</h2>
              <div className='flex gap-2 items-center'>
                <button 
                  className='px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-full transition-colors'
                  onClick={(e) => {
                    e.stopPropagation()
                    clearHistory()
                  }}
                >
                  Clear History
                </button>
                <button 
                  className='text-gray-500 hover:text-gray-700 text-2xl'
                  onClick={() => setShowHistory(false)}
                >
                  ×
                </button>
              </div>
            </div>
            
            {questionHistory.length === 0 ? (
              <div className='text-center text-gray-500 py-8'>
                No questions in history yet
              </div>
            ) : (
              <div className='space-y-3 overflow-y-auto max-h-[60vh] pr-2'>
                {questionHistory.map((item, index) => (
                  <div key={index} className='p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'>
                    <div className='flex justify-between items-start gap-4'>
                      <p className='text-gray-800'>{item.text}</p>
                      <span className='text-xs text-gray-500 whitespace-nowrap'>
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Main content with top margin to account for fixed buttons */}
      <div className='w-full max-w-[1200px] mt-[60px] sm:mt-[70px] md:mt-[80px] flex flex-col items-center'>
        <div className='w-[280px] sm:w-[300px] h-[380px] sm:h-[400px] flex justify-center items-center 
        overflow-hidden rounded-3xl sm:rounded-4xl shadow-lg'>
          <img src={userData?.assistantImage} alt="" className='h-full w-full object-cover'/>
        </div>
        <h1 className='text-white text-[16px] sm:text-[18px] font-semibold mt-4'>
          I'm {userData?.assistantName}
        </h1>
        {/* Animation between name and response */}
        <div className='w-[80px] sm:w-[100px] h-[80px] sm:h-[100px] my-2'>
          {currentGif === "ai" && (
            <img src={aiGif} alt="AI Speaking" className='w-full h-full object-contain'/>
          )}
          {currentGif === "user" && (
            <img src={userGif} alt="User Speaking" className='w-full h-full object-contain'/>
          )}
        </div>
        <div className='flex flex-col items-center gap-2 px-4'>
          {/* Response Display - only show when AI is speaking */}
          {currentGif === "ai" && assistantResponse && (
            <h4 className='text-white text-[16px] sm:text-[18px] md:text-[20px] font-medium text-center 
            max-w-full sm:max-w-[600px] md:max-w-[800px]'>
              {assistantResponse}
            </h4>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home

