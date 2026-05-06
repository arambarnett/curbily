import React, { useState, useEffect } from 'react';
import { MapPin, Plus, X, Navigation, Check, Loader2, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import LocationAutocomplete, { NominatimResult } from './LocationAutocomplete';
import { Project, Location } from '../../types';
import { cn } from '../../lib/utils';

export default function LocationManager({ project }: { project: Project }) {
  const [search, setSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const handleAddLocation = async (result: NominatimResult) => {
    const newLocation: Location = {
      id: Math.random().toString(36).substr(2, 9),
      name: result.display_name.split(',')[0],
      address: result.display_name,
      placeId: result.place_id.toString(),
      isBase: !project.locations || project.locations.length === 0,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      }
    };

    try {
      await updateDoc(doc(db, 'projects', project.id), {
        locations: arrayUnion(newLocation),
        // If it's the first location, make it the main one
        location: project.location || newLocation.name
      });
      setSearch('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    }
  };

  const handleRemoveLocation = async (location: Location) => {
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        locations: arrayRemove(location)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    }
  };

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!response.ok) throw new Error("Network response was not ok");
          const data = await response.json();
          handleAddLocation({
            place_id: data.place_id,
            display_name: data.display_name,
            lat: latitude.toString(),
            lon: longitude.toString()
          });
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          alert('Failed to determine the address of your current location. Please check your internet connection or search manually.');
        } finally {
          setIsLocating(false);
        }
      }, (error) => {
        console.error('Geolocation failed:', error);
        alert('Could not access your location. Please ensure location permissions are granted in your browser.');
        setIsLocating(false);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
      setIsLocating(false);
    }
  };

  const setAsBase = async (location: Location) => {
    const updatedLocations = project.locations?.map(loc => ({
      ...loc,
      isBase: loc.id === location.id
    })) || [];

    try {
      await updateDoc(doc(db, 'projects', project.id), {
        locations: updatedLocations,
        location: location.name
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    }
  };

  const toggleApproval = async (location: Location) => {
    const updatedLocations = project.locations?.map(loc => ({
      ...loc,
      isApproved: loc.id === location.id ? !loc.isApproved : loc.isApproved
    })) || [];

    try {
      await updateDoc(doc(db, 'projects', project.id), {
        locations: updatedLocations
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${project.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Production Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="flex gap-2">
              <LocationAutocomplete
                value={search}
                onChange={setSearch}
                onSelect={handleAddLocation}
                placeholder="Search for a location (e.g. 'Los Angeles', 'Central Park')..."
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={handleUseCurrentLocation} 
                disabled={isLocating}
                className="gap-2"
              >
                {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                Current Location
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.locations?.map((loc) => (
              <div 
                key={loc.id} 
                className={cn(
                  "p-4 rounded-xl border transition-all flex items-start justify-between group",
                  loc.isBase ? "border-blue-500 bg-blue-50/30" : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    loc.isBase ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{loc.name}</p>
                      {loc.isBase && <Badge className="bg-blue-600 text-[8px] uppercase py-0">Base</Badge>}
                      {loc.isApproved && <Badge className="bg-green-600 text-[8px] uppercase py-0 flex gap-1 items-center"><Check className="w-2 h-2" /> Approved</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{loc.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                          "h-auto p-0 text-[10px] font-bold",
                          loc.isApproved ? "text-amber-600" : "text-green-600"
                        )}
                        onClick={() => toggleApproval(loc)}
                      >
                        {loc.isApproved ? 'Revoke Approval' : 'Approve Location'}
                      </Button>
                      {!loc.isBase && (
                        <>
                          <span className="text-[10px] text-slate-300">|</span>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-[10px] text-blue-600"
                            onClick={() => setAsBase(loc)}
                          >
                            Set as Base
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveLocation(loc)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {(!project.locations || project.locations.length === 0) && (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
              <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm text-slate-500">No locations added yet.</p>
              <p className="text-xs text-slate-400 mt-1">Search or use your current location to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
