import Map from "./Map";
import QRCode from "qrcode.react";
import {Link, Redirect} from "react-router-dom";
import React from "react";
import {Text} from "../context/Language";

//Display information about a selected POI
function POIDetails(props) {
    const poisCol = [props.selectedPOI];

    if (props.selectedPOI !== undefined) {
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
                            <button><Text tid="backToList"/></button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    } else {
        return (
            <Redirect to="/POIList"/>
        );
    }
}

export default POIDetails;