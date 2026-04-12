package com.medhistory.auth;

import org.hibernate.envers.RevisionListener;

public class CustomRevisionListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        CustomRevisionEntity revision = (CustomRevisionEntity) revisionEntity;
        SecurityUtils.getCurrentUserId().ifPresent(revision::setModifiedBy);
    }
}
