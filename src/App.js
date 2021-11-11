import "./App.css";

import {firebase} from "./initFirebase";
import {useAuth} from "./context/AuthContext";
import SignIn from "./pages/SignIn";
import React, {useEffect, useState} from "react";
import "leaflet/dist/leaflet.css";
import {Text} from "./context/Language";
import LanguageSelector from "./components/LanguageSelector";
import {BrowserRouter as Router, Link, Redirect, Route} from "react-router-dom";
import POIsList from "./components/POIsList";
import {AddPOI, POIEdit} from "./components/POIForms"
import POIDetails from "./components/POIDetails";

// Get the DB object from the firebase app
const db = firebase.firestore();

//Reference to a collection of POIs
const COLLECTION_POIS = "pois";
const COLLECTION_USERS = "users";
let poiCurrentUser = [];

let CURRENT_USER = null;

function App() {
    // Get authenticated state using the custom "auth" hook
    const {isAuthenticated, isAdmin} = useAuth();
    const [isAddForm, setIsAddForm] = useState(false);
    //Store an entire collection of POIs in the state
    const [poisCollection, setPoisCollection] = useState([]);
    //Collection of the users
    const [userCollection, setUserCollection] = useState([]);
    let isUserInDB = null;

    let handleIsAddForm = () => {
        setIsAddForm((isAddForm) => isAddForm = !isAddForm);
    }

    //buttonFormList is only for admin and allow
    //to change between the list and the form
    let buttonFormList;

    buttonFormList = <Link to={isAddForm ? "/POIList" : "/POIForm"}>
        <button onClick={handleIsAddForm}
                style={{width: '120px', height: '50px'}}>{isAddForm ? "Back to list" : "Add new POI"}</button>
    </Link>

    useEffect(() => {
        if (isAuthenticated) {
            //Fetch POIs of your DB
            const poissCollection = db.collection(COLLECTION_POIS);


            // Subscribe to DB changes
            const unsubscribe = poissCollection.onSnapshot(
                (snapshot) => {
                    setPoisCollection(snapshot.docs.map((d) => {
                        let data = d.data();
                        data['id'] = d.id
                        return data
                    }))
                },
                (error) => console.error(error)
            );
            // Unsubscribe on unmount
            return () => unsubscribe();
        }
    }, [isAuthenticated]);

    const sortPOIs = () => {
        // fetch current user
        CURRENT_USER = userCollection.find(user => firebase.auth().currentUser.uid === user.id)
        poiCurrentUser = poisCollection.filter(poi => CURRENT_USER.pois.includes(poi.id))
    }

    useEffect(() => {
        if (isAuthenticated) {
            const myUserCollection = db.collection(COLLECTION_USERS);
            // Subscribe to DB changes
            const unsubscribe = myUserCollection.onSnapshot(
                (snapshot) => {
                    // Store the attributes of all POIs
                    //and add an id attributes to the object
                    setUserCollection(snapshot.docs.map((d) => {
                        let data = d.data();
                        data['id'] = d.id
                        return data
                    }));
                },
                (error) => console.error(error)
            );
            return () => unsubscribe();
        }
    }, [isAuthenticated])

    // Log out of the application
    const signOut = async () => {
        try {
            await firebase.auth().signOut();
        } catch (e) {
            console.error(e);
        }
    };

    // If the user is not authenticated, render the "SignIn" component (Firebase UI)
    if (!isAuthenticated) return <SignIn/>;

    if (isAdmin === false) {
        const currentId = firebase.auth().currentUser.uid;
        let u = userCollection.map(element => element.id === currentId)
        if (u.length !== 0) {
            u.forEach(element => {
                if (element) {
                    isUserInDB = true
                }
            })
            if (isUserInDB === null)
                isUserInDB = false
        }
        if (isUserInDB === false) {
            try {
                db.collection(COLLECTION_USERS).doc(firebase.auth().currentUser.uid).set({
                    name: firebase.auth().currentUser.displayName,
                    pois: [],
                    gpxs: []
                })
                isUserInDB = true;
            } catch (e) {
                console.error("Could not add User" + e.message)
            }
        }
    }

    let user = userCollection.find(user => firebase.auth().currentUser.uid === user.id)
    if (isAdmin === false && user !== undefined) {
        sortPOIs()
    }
    if (isAdmin === true)
        poiCurrentUser = poisCollection

    // Normal rendering of the app for authenticated users
    return (
        <Router>
            <div className="App">
                <header>
                    <h1 className='title'><Text tid="title"/></h1>
                    {isAdmin ? "Admin" : "User"}
                    <button onClick={signOut} className='logoutButton'>Logout</button>
                    <div style={{padding: "50px"}}/>
                    <LanguageSelector/>
                </header>

                <Route exact path="/">
                    <Redirect to="/POIList"/>
                </Route>
                <Route path="/POIForm"
                       render={() => <AddPOI isAdmin={isAdmin} buttonFormList={buttonFormList}
                                             poisCollection={poisCollection}/>}
                />
                <Route path="/POIList"
                       render={() => <POIsList pois={isAdmin ? poisCollection : poiCurrentUser} isAdmin={isAdmin}
                                               buttonFormList={buttonFormList}
                                               poisCollection={isAdmin ? poisCollection : poiCurrentUser}/>
                       }
                />
                <Route path="/POIDetails/:id"
                       render={routeParams => (<POIDetails
                           selectedPOI={poisCollection.find((poi) => poi.id === routeParams.match.params.id)}
                           isAdmin={isAdmin} buttonFormList={buttonFormList} poisCollection={poisCollection}/>)}
                />
                <Route path="/POIEdit/:id"
                       render={routeParams => (
                           <POIEdit selectedPOI={poisCollection.find((poi) => poi.id === routeParams.match.params.id)}
                                    poisCollection={poisCollection}/>)}
                />
            </div>
        </Router>
    );
}

export default App;
