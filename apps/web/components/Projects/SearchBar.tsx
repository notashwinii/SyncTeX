'use client'
import styles from "@/components/Projects/projects.module.css";

const Search = () => {
  return (
    <div>
      <input 
        type="text" 
        placeholder="Search in all Projects..." 
        className={styles.searchBar} 
      />
    </div>      
  );
};

export default Search;
