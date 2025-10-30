import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const userDataContext = createContext();

function UserContext({ children }) {
  const serverUrl = "http://localhost:3000";
  const [userData, setUserData] = useState(null);
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  
  const handleCurrentUser = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/user/current`, {
        withCredentials: true
      });
      setUserData(result.data);
      console.log(result.data);
    } catch (error) {
      console.log(error);
    }
  };

 
  const getGeminiResponse = async (command) => {
    try {
      const result = await axios.post(
        `${serverUrl}/api/user/asktoassistant`,
        {command},
        {
          withCredentials: true,
          timeout: 30000 // 30 second timeout
        }
      );
      return result.data;
    } catch (error) {
      console.log('Error in getGeminiResponse:', error.message);
      // Return a proper error response
      return {
        type: 'error',
        response: "I'm sorry, but I encountered an error processing your request. Please try again."
      };
    }
  };

  useEffect(() => {
    handleCurrentUser();
  }, []);

  const value = {
    serverUrl,
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
    getGeminiResponse
  }

  return (
    <userDataContext.Provider value={value}>
      {children}
    </userDataContext.Provider>
  );
}

export default UserContext;








// import React, { createContext, useEffect, useState } from 'react'
// export const userDataContext = createContext()
// import axios from "axios"

// function UserContext({children}) {

//     const serverUrl = "http://localhost:3000"
//     const [userData, setUserData] = React.useState(null)
//     const [frontendImage, setFrontendImage] = useState(null);
//     const [backendImage, setBackendImage] = useState(null);
//     const [selectedImage, setSelectedImage] = useState(null)

//     const handleCurrentUser = async () => {
//       try {
//         const result = await axios.get(`${serverUrl}/api/user/current`, {
//           withCredentials: true})
//         setUserData(result.data)
//         console.log(result.data)
//       } catch (error) {
//         console.log(error)
//       }
//     }


//     const getGeminiResponse = async (command) => {
//       try {
//         const result = await axios.post(`${serverUrl}/api/user/asktoassistant`, {command},{withCredentials:true})
//         return result.data
//       } catch (error) {
//         console.log(error)
//       }
//     }

//     useEffect(() => {
//       handleCurrentUser()
//     }, [])

//     const value = {
//         serverUrl, userData, setUserData, backendImage, setBackendImage, frontendImage, setFrontendImage,
//         selectedImage, setSelectedImage, getGeminiResponse
//     }

//   return (
//    <div>
//     <userDataContext.Provider value={value}>
//     {children}
//     </userDataContext.Provider>
//    </div>
//   )
// }

// export default UserContext
