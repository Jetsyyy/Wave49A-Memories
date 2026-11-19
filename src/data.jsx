import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

// Shared albums list + global modals (upload, memory viewer, profile).
const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const [albums, setAlbums] = useState(null);
  const [version, setVersion] = useState(0);
  const [upload, setUpload] = useState(null); // { albumId }
  const [viewer, setViewer] = useState(null); // { list, index }
  const [profile, setProfile] = useState(false);
  const [albumForm, setAlbumForm] = useState(false);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    api('albums')
      .then((d) => setAlbums(d.albums))
      .catch(() => setAlbums((a) => a || []));
  }, [version]);

  const value = {
    albums,
    version,
    refresh,
    upload,
    openUpload: (albumId = null) => setUpload({ albumId }),
    closeUpload: () => setUpload(null),
    viewer,
    openViewer: (list, index) => setViewer({ list, index }),
    setViewer,
    profile,
    openProfile: () => setProfile(true),
    closeProfile: () => setProfile(false),
    albumForm,
    openAlbumForm: () => setAlbumForm(true),
    closeAlbumForm: () => setAlbumForm(false),
  };
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  return useContext(DataCtx);
}
