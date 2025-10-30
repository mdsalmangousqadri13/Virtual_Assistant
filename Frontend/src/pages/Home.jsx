import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const Home = () => {
  const {userData, serverUrl, setUserData, getGeminiResponse} = useContext(userDataContext)
  const navigate = useNavigate()
  const [listening, setListening] = useState(false)
  const [assistantResponse, setAssistantResponse] = useState("")
  const isSpeakingRef = useRef(false)
  const recognitionRef = useRef(null)
  const synth = window.speechSynthesis

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
    
    // Get available voices
    const voices = synth.getVoices()
    
    if (isHindi) {
      // For Hindi content, try to find female Hindi voice
      const hindiVoice = voices.find(voice => 
        voice.lang.includes('hi-IN') && voice.name.toLowerCase().includes('female'))
      if (hindiVoice) {
        utterance.voice = hindiVoice
      }
    } else {
      // For English content, use default voice
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en-US') || voice.lang.includes('en-GB'))
      if (englishVoice) {
        utterance.voice = englishVoice
      }
    }

    isSpeakingRef.current = true
    utterance.onend = () => {
      isSpeakingRef.current = false
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

    // Handle voice loading
    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', () => {
        const updatedVoices = synth.getVoices()
        if (isHindi) {
          const hindiVoice = updatedVoices.find(voice => 
            voice.lang.includes('hi-IN') && voice.name.toLowerCase().includes('female'))
          if (hindiVoice) {
            utterance.voice = hindiVoice
          }
        }
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
      
      // Try to restart after 10 seconds if we're not speaking
      if (!isSpeakingRef.current) {
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
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center 
    items-center flex-col gap-[15px]'>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white 
          rounded-full text-[19px] absolute top-[20px] right-[20px] cursor-pointer' onClick={handleLogOut}>
        Log Out
      </button>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white 
          rounded-full text-[19px] absolute top-[100px] right-[20px] cursor-pointer px-[20px] py-[10px]' 
          onClick={()=>navigate("/customize")}>
        Customize your Assistant
      </button>
      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl 
      shadow-lg'>
        <img src={userData?.assistantImage} alt="" className='h-full object-cover'/>
      </div>
      <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>
      <div className='flex flex-col items-center gap-2'>
        <p className='text-white text-[16px]'>{listening ? '🎤 Listening...' : '🔄 Will try again in 10s'}</p>
        
        {/* Response Display */}
        {assistantResponse && (
          <h4 className='text-white text-[20px] font-medium text-center max-w-[800px] px-4'>
            {assistantResponse}
          </h4>
        )}
      </div>
    </div>
  )
}

export default Home

