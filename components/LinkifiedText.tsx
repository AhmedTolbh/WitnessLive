import React from 'react';

// A simple regex to find URLs in text. It looks for http/https followed by non-space characters.
const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

interface LinkifiedTextProps {
  children: string;
}

const LinkifiedText: React.FC<LinkifiedTextProps> = ({ children }) => {
  if (!children) {
    return null;
  }
  
  const parts = children.split(urlRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (part && part.match(urlRegex)) {
          // Ensure the URL has a protocol, default to https if missing for robustness
          let href = part;
          if (!/^https?:\/\//i.test(href)) {
            href = 'https://' + href;
          }
          return (
            <a 
              key={index} 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-400 hover:text-purple-300 hover:underline"
              onClick={(e) => e.stopPropagation()} // Prevent any parent handlers from firing
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

export default LinkifiedText;
