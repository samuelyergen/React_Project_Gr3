import "./App.css";

import {firebase} from "./initFirebase";
import {useAuth} from "./context/AuthContext";
import SignIn from "./pages/SignIn";
import {useEffect, useState} from "react";
import {MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents} from 'react-leaflet';
import "leaflet/dist/leaflet.css" ;
import React from "react";
import QRCode from 'qrcode.react';
import gpxParser from "gpxparser";
import {Text} from "./context/Language";
import LanguageSelector from "./components/LanguageSelector";
import {BrowserRouter as Router, Switch, Route, Link, Redirect} from "react-router-dom";

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import L, {bind} from "leaflet";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});

// Get the DB object from the firebase app
const db = firebase.firestore();

//Reference to a collection of POIs
const COLLECTION_POIS = "pois";
const COLLECTION_USERS = "users";
let poiCurrentUser = [];


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
    let buttonFormList ;

    buttonFormList =  <Link to={isAddForm ? "/POIList" : "/POIForm"}><button onClick={handleIsAddForm} style={{width : '120px', height : '50px'}}>{isAddForm ? "Back to list" : "Add new POI"}</button></Link>


  useEffect( () => {

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
  }, []);

  const sortPOIs = () => {
      let user = userCollection.find(user => firebase.auth().currentUser.uid === user.id)
      poiCurrentUser = poisCollection.filter(poi => user.pois.includes(poi.id))
  }

  useEffect(() => {
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
    }, [])


    // WARNING: Only for debugging purposes, this should not be used in a production environment!
    /*const cleanDB = async () => {
      const ref = db.collection(COLLECTION_POIS);

      let snapshot = await ref.get();

      for (let doc of snapshot.docs) {
        try {
          await ref.doc(doc.id).delete();
        } catch (e) {
          console.error(`Could not delete document with ID ${doc.id} `);
          console.error(e);
        }
      }
    };*/

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
        if(u.length != 0){
            u.forEach(element => {
                if (element) {
                    isUserInDB = true
                }
            })
            if(isUserInDB === null)
                isUserInDB = false
        }
        console.log("u : " + isUserInDB)
        if (isUserInDB === false) {
            try {
                db.collection(COLLECTION_USERS).doc(firebase.auth().currentUser.uid).set({
                    name: firebase.auth().currentUser.displayName
                })
            } catch (e) {
                console.error("Could not add User" + e.message)
            }
        }
    }

    let user = userCollection.find(user => firebase.auth().currentUser.uid === user.id)
    if(isAdmin === false && user != undefined){
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
                    <div style={{padding: "50px"}}></div>
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
                       render={() => <POIsList pois={isAdmin ? poisCollection : poiCurrentUser} isAdmin={isAdmin} buttonFormList={buttonFormList}
                                               poisCollection={isAdmin ? poisCollection : poiCurrentUser} isAdmin={isAdmin}/>}
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

//return a form that allow to add a new POI to the collection
//Admin only
class AddPOI extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newPOI: this.emptyPOI,
            currentPosX: null,
            currentPosY: null
        }
    }

    emptyPOI = {name: '', description: '', URL: '', coordinate_x: '', coordinate_y: ''};

    //detect changes in the fields' form
    //set the newPOI state with the written values
    handleChange = (e) => {
        const target = e.target;
        const name = target.name;
        this.setState(prevState => ({
            newPOI: {...prevState.newPOI, [name]: target.value}
        }));
        console.log(this.state.newPOI);
    }

    //add a new POI to the global collection (not user specific collection)
    handleSubmit = async (e) => {

        e.preventDefault();

        const poisCollectionTemp = db.collection(COLLECTION_POIS);

        try {
            await poisCollectionTemp.add({
                name: this.state.newPOI.name,
                description: this.state.newPOI.description,
                URL: this.state.newPOI.URL,
                coordinate_x: this.state.currentPosX,
                coordinate_y: this.state.currentPosY
            });
        } catch (e) {
            console.error("Could not add new POI" + e.message);
        }
        this.resetNewPOI();
    }

    resetNewPOI = () => {
        this.setState({newPOI: this.emptyPOI});
    }

    handleSetPos = (pos) => {
        this.setState({currentPosX: pos.lat});
        this.setState({currentPosY: pos.lng});
    }

    render() {
        return (
            <div className="map_poi_container">
                <Map poisCol={this.props.poisCollection} handleSetPos={this.handleSetPos}/>
                <div>
                    {this.props.isAdmin && (
                        <>
                            {this.props.buttonFormList}
                        </>
                    )}
                    <FormPOI handleChange={this.handleChange} handleSubmit={this.handleSubmit}
                             name={this.state.newPOI.name} description={this.state.newPOI.description}
                             coordinate_x={this.state.currentPosX} coordinate_y={this.state.currentPosY}
                             URL={this.state.newPOI.URL}/>
                </div>
            </div>
        );
    }

}

class FormInputs extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <>
                <input type={this.props.type} name={this.props.name} value={this.props.value}
                       onChange={this.props.onChange} placeholder={this.props.placeholder}/>
            </>
        );
    }
}

//fetch the pois and return the name in a list
function POIsList(props) {

    const [selectedPOI, setSelectedPOI] = React.useState(null);

    async function handleDelete(id) {

        const ref = db.collection(COLLECTION_POIS);

        let snapshot = await ref.get();

        for (let doc of snapshot.docs) {
            try {

                if (doc.id == id) {
                    await ref.doc(doc.id).delete();
                }

            } catch (e) {
                console.error(`Could not delete document with ID ${doc.id} `);
                console.error(e);
            }
        }
    }

    const [showQR, setShowQR] = React.useState(false)
    const toggleQR = () => setShowQR(!showQR)
    return (
        <div className="map_poi_container">
            <Map poisCol={props.poisCollection}/>
            <div>
                {props.isAdmin && (
                    <>
                        {props.buttonFormList}
                    </>
                )}
                <div id="poisList">
                    <button onClick={toggleQR}>{showQR ? 'hide QR Codes' : 'show QR Codes'}</button>
                    <h4>POIs Collection</h4>
                    <ul style={{listStyleType: "none"}}>
                        {props.pois.map((mapItem, index) => (
                            <li key={index} style={{border: "1px solid white"}}>
                                <Link to={`/POIDetails/${mapItem.id}`} style={{color: "white", textDecoration: "none"}}>
                                    <div>
                                        <p>{mapItem.name}</p>
                                        {showQR ? <QRCode value={mapItem.URL}/> : ''}<br/>
                                    </div>
                                </Link>
                                {props.isAdmin && (
                                    <>
                                        <button onClick={() => handleDelete(mapItem.id)}>delete</button>
                                        <Link to={`/POIEdit/${mapItem.id}`}>
                                            <button>Edit</button>
                                        </Link>
                                    </>

                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )

}

//Useless for now
class POI extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: this.props.id,
            name: this.props.name,
            description: this.props.description,
            coordinate_x: this.props.coordinate_x,
            coordinate_y: this.props.coordinate_y,
            URL: this.props.URL,
            visited: false
        }
    }

    //<POI {...mapItem}>
    render() {
        return (
            <span>{this.state.name}</span>

        )
    }

}

//display the route from a gpx file
function Map(props) {

    let fileReader;
    const [mapPosition, setMapPosition] = useState([])

    const [currentPosition, setCurrentPosition] = useState([0, 0])

    const handleReading = () => {
        const text = fileReader.result;
        parseFile(text);
    }

    const handleSubmission = (e) => {
        fileReader = new FileReader()
        fileReader.onloadend = handleReading;
        fileReader.readAsText(e.target.files[0])
    }

    const setPosition = (pos) => {
        setCurrentPosition(pos);
        props.handleSetPos(pos);
    }

    const parseFile = (content) => {
        let gpxParser = require('gpxparser');
        let gpx = new gpxParser();
        gpx.parse(content)
        setMapPosition(() => (gpx.tracks[0].points.map(p => [p.lat, p.lon])));
    }

    return (
        <>
            <input type="file" onChange={handleSubmission}/>
            <MapContainer
                center={[46.307205, 7.631260]}
                zoom={9}
                scrollWheelZoom={false}
                style={{width: '700px', height: '500px'}}
                className="mapping"
            >
                <TileLayer
                    url="https://wmts20.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg"/>
                {(mapPosition.length && (
                    <Polyline
                        pathOptions={{fillColor: 'red', color: 'blue'}}
                        positions={mapPosition}
                    />
                ))}

                {props.poisCol.map((mapItem) => {
                    const pos = {lat: mapItem.coordinate_x, lng: mapItem.coordinate_y};
                    return (
                        <Marker icon={DefaultIcon} position={pos}>
                            <Popup>
                                <Link to={`/POIDetails/${mapItem.id}`}>{mapItem.name}</Link>
                            </Popup>
                        </Marker>
                    )
                })}
                <Route path="/POIForm"
                       render={() => (
                           <>
                               <GetPos setPosition={setPosition}/>
                               <Marker icon={DefaultIcon} position={currentPosition}/>
                           </>
                       )}
                />

            </MapContainer>
        </>
    )
}

function GetPos(props) {
    useMapEvents({
        click: (e) => {
            props.setPosition(e.latlng)
        }
    });
    return null;
}

//useless for now
function FileList() {

    const [files, setFiles] = useState([])


    return (
        <div>
            <h4>File Collection</h4>
            <ul>
                {files.map((mapItem, index) => (
                    <li key={index}>
                        {mapItem.name}
                    </li>
                ))}
            </ul>
        </div>
    )
}

//Allow to edit a POI in the global collection
//Only for admins
class POIEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            editablePOI: this.poi
        }
    }

    poi = {
        name: this.props.selectedPOI.name,
        description: this.props.selectedPOI.description,
        URL: this.props.selectedPOI.URL,
        coordinate_x: this.props.selectedPOI.coordinate_x,
        coordinate_y: this.props.selectedPOI.coordinate_y,
        id: this.props.selectedPOI.id
    }

    poisCol = [this.props.selectedPOI];

    handleChange = (e) => {
        const target = e.target;
        const name = target.name;
        this.setState(prevState => ({
            editablePOI: {...prevState.editablePOI, [name]: target.value}
        }));
        console.log(this.state.editablePOI);
    }

    handleSubmit = async (e) => {

        e.preventDefault();

        const poiRef = db.collection(COLLECTION_POIS).doc(this.state.editablePOI.id)

        try {
            await poiRef.set(
                {
                    'name': this.state.editablePOI.name,
                    'description': this.state.editablePOI.description,
                    'URL': this.state.editablePOI.URL,
                    'coordinate_x': this.state.editablePOI.coordinate_x,
                    'coordinate_y': this.state.editablePOI.coordinate_y
                })
        } catch {
            console.error("Could not update POI" + e.message);
        }
    }

    render() {
        return (
            <div className="map_poi_container">
                <Map poisCol={this.poisCol}/>
                <div>
                    <Link to="/POIList">
                        <button style={{width: '120px', height: '50px'}}>back to List</button>
                    </Link>
                    <FormPOI handleChange={this.handleChange} handleSubmit={this.handleSubmit}
                             name={this.state.editablePOI.name} description={this.state.editablePOI.description}
                             coordinate_x={this.state.editablePOI.coordinate_x}
                             coordinate_y={this.state.editablePOI.coordinate_y} URL={this.state.editablePOI.URL}/>
                </div>

            </div>
        );
    }
}

//Form used to add or edit a POI
function FormPOI(props) {
    return (
        <form onSubmit={props.handleSubmit}>
            <br/>
            <label>Name : <FormInputs type="text" onChange={props.handleChange} name="name" placeholder="Name"
                                      value={props.name}/></label><br/>
            <label>Description : <FormInputs type="text" onChange={props.handleChange} name="description"
                                             placeholder="Description" value={props.description}/></label><br/>
            <label>Coordinate X : <FormInputs type="text" onChange={props.handleChange} name="coordinate_x"
                                              placeholder="Coordinate x" value={props.coordinate_x}/></label><br/>
            <label>Coordinate Y : <FormInputs type="text" onChange={props.handleChange} name="coordinate_y"
                                              placeholder="Coordinate y" value={props.coordinate_y}/></label><br/>
            <label>URL : <FormInputs type="text" onChange={props.handleChange} name="URL" placeholder="URL"
                                     value={props.URL}/></label><br/>
            <input type="submit" value="Submit"/>
        </form>
    )
}

//Display information about a selected POI
function POIDetails(props) {

    const poisCol = [props.selectedPOI];

    return (
        <div className="map_poi_container">

            <Map poisCol={poisCol}/>
            <div>
                {props.isAdmin && (
                    <>
                        {props.buttonFormList}
                    </>
                )}
                <div>
                    <h4>{props.selectedPOI.name}</h4>
                    <p>{props.selectedPOI.description}</p>
                    <a href={props.selectedPOI.URL}>
                        <QRCode value={props.selectedPOI.URL}/>
                    </a><br/>
                    <Link to="/POIList">
                        <button>back to List</button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default App;
