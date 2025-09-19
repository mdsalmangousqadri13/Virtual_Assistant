import React, { createContext, useEffect } from 'react'
export const userDataContext = createContext()
import axios from "axios"

function UserContext({children}) {

    const serverUrl = "http://localhost:3000"
    const [userData, setUserData] = React.useState(null)

    const handleCurrentUser = async () => {
      try {
        const result = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true})
        setUserData(result.data)
        console.log(result.data)
      } catch (error) {
        console.log(error)
      }
    }

    useEffect(() => {
      handleCurrentUser()
    }, [])

    const value = {
        serverUrl, userData, setUserData
    }

  return (
   <div>
    <userDataContext.Provider value={value}>
    {children}
    </userDataContext.Provider>
   </div>
  )
}

export default UserContext