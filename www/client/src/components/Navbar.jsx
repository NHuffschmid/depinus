// inspired by https://www.youtube.com/watch?v=SLfhMt5OUPI
// How To Create A Navbar In React With Routing

import React from 'react';
import { Link, useResolvedPath, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCookies } from 'react-cookie';

export default function Navbar() {

    const { t } = useTranslation();

    return (
        <nav className="nav">
            <ul>
                <CustomLink to="/">Depinus</CustomLink>
                <CustomLink to="/archive">{t('Archive')}</CustomLink>
                <CustomLink to="/settings">{t('Settings')}</CustomLink>
                <CustomLink to="/about">{t('About')}</CustomLink>
            </ul>
        </nav>
    )
}

function CustomLink({ to, children, ...props }) {
    const resolvedPath = useResolvedPath(to)
    const isActive = useMatch({ path: resolvedPath.pathname, end: true })
    const [cookies] = useCookies(['color']);

    return (
        <li style={ isActive ? {backgroundColor: cookies.color} : null}>
            <Link to={to} {...props}>
                {children}
            </Link>
        </li>
    )
}
